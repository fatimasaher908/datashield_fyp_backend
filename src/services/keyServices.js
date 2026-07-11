import crypto from "crypto";
import argon2 from "argon2";
import { pool } from "../db/db.js";


const subtle = crypto.webcrypto.subtle;
//generate a random AES key for encryption

export async function createKeyService(user_id, pin) {

console.log("Step 1");
const aesKey = generateAESKey();

console.log("Step 2");
const kekSalt = crypto.randomBytes(16);

console.log("Step 3");
const kek = await deriveKEK(pin, kekSalt);

console.log("Step 4");
const wrappedDEK = await wrapKeyRFC3394(aesKey, kek);

console.log("Step 5");

    // 5. Hash PIN for authentication
    const pinHash = await argon2.hash(pin);

    // 6. Store KEK salt + wrapped key
    await pool.query(
        `
        INSERT INTO "UserKey" (user_id, encrypted_key, kek_salt)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET
            encrypted_key = EXCLUDED.encrypted_key,
            kek_salt = EXCLUDED.kek_salt
        `,
        [user_id, wrappedDEK, kekSalt.toString("base64")]
    );

    // 7. Store PIN hash in users table
    await pool.query(
        `
        UPDATE users
        SET pin_hash = $1
        WHERE id = $2
        `,
        [pinHash, user_id]
    );

    return {
        wrapped: true
    };
}
async function importKEK(kek) {
    return await subtle.importKey(
        "raw",
        kek,
        {
            name: "AES-KW"
        },
        false,
        ["wrapKey", "unwrapKey"]
    );
}


export async function decryptKeyRFC3394(wrapped, kek) {

    const wrappingKey = await importKEK(kek);

    const wrappedBuffer = Buffer.from(wrapped, "base64");

    const dekKey = await subtle.unwrapKey(
        "raw",
        wrappedBuffer,
        wrappingKey,
        {
            name: "AES-KW"
        },
        {
            name: "AES-GCM",
            length: 256
        },
        true,
        ["encrypt", "decrypt"]
    );

    const rawKey = await subtle.exportKey(
        "raw",
        dekKey
    );

    return Buffer.from(rawKey);
}

export async function wrapKeyRFC3394(dek, kek) {

    const wrappingKey = await importKEK(kek);

    const dekKey = await subtle.importKey(
        "raw",
        dek,
        {
            name: "AES-GCM"
        },
        true,
        ["encrypt", "decrypt"]
    );

    const wrapped = await subtle.wrapKey(
        "raw",
        dekKey,
        wrappingKey,
        {
            name: "AES-KW"
        }
    );

    return Buffer.from(wrapped).toString("base64");
}


//fetch rotation count for a user
export async function getRotationCount(user_id) {
    const result = await pool.query(
        `SELECT rotation_count
         FROM "UserKey"
         WHERE user_id = $1`,
        [user_id]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0].rotation_count;
}
//check if key is revoked for a user
export async function isKeyRevoked(user_id) {
    const result = await pool.query(
        `SELECT is_revoked
         FROM "UserKey"
         WHERE user_id = $1`,
        [user_id]
    );

    if (result.rows.length === 0) {
        return null;
    }

    return result.rows[0].is_revoked;
}

export function deriveKEK(pin, salt) {
    return crypto.pbkdf2Sync(
        pin,
        salt,
        100000,
        32,
        "sha256"
    );
}
// Generate 256-bit AES key (32 bytes)
export function generateAESKey() {
    return crypto.randomBytes(32);
}

// Revoke a user's key
export async function revokeKeyService(user_id) {

    // 1. Check if key exists
    const result = await pool.query(
        `SELECT * FROM "UserKey" WHERE user_id = $1`,
        [user_id]
    );

    if (result.rows.length === 0) {
        throw {
            status: 404,
            message: "Key not found"
        };
    }

    const keyRecord = result.rows[0];

    // 2. Check if already revoked
    if (keyRecord.is_revoked) {
        throw {
            status: 400,
            message: "Key already revoked"
        };
    }

    // 3. Revoke key (IMPORTANT STEP)
    await pool.query(
        `
        UPDATE "UserKey"
        SET is_revoked = true
        WHERE user_id = $1
        `,
        [user_id]
    );

    return {
        success: true,
        message: "Key revoked successfully"
    };
}