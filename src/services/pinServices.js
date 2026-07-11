import crypto from "crypto";
import argon2 from "argon2";

import { pool } from "../db/db.js";
import { deriveKEK, wrapKeyRFC3394, decryptKeyRFC3394  } from "../services/keyServices.js"

export async function changePinService(user_id, oldPin, newPin) {
    // 1. Get user PIN hash
    const userResult = await pool.query(
        `SELECT pin_hash FROM users WHERE id = $1`,
        [user_id]
    );

    if (userResult.rows.length === 0) {
        throw {
            status: 404,
            message: "User not found"
        };
    }

    const pinHash = userResult.rows[0].pin_hash;

    // 2. Verify old PIN
    const isValid = await argon2.verify(pinHash, oldPin);

    if (!isValid) {
        throw {
            status: 401,
            message: "Old PIN is incorrect"
        };
    }

    // 3. Get key record
    const keyResult = await pool.query(
        `SELECT * FROM "UserKey" WHERE user_id = $1`,
        [user_id]
    );

    if (keyResult.rows.length === 0) {
        throw {
            status: 404,
            message: "Encryption key not found"
        };
    }

    const record = keyResult.rows[0];

    // 4. Derive OLD KEK
    const oldKEK = await deriveKEK(
        oldPin,
        Buffer.from(record.kek_salt, "base64")
    );

    // 5. UNWRAP DEK
    const dek = await decryptKeyRFC3394(
        record.encrypted_key,
        oldKEK
    );

    // 6. Generate NEW KEK salt
    const newSalt = crypto.randomBytes(16);

    // 7. Derive NEW KEK
    const newKEK = await deriveKEK(
        newPin,
        newSalt
    );

    // 8. WRAP DEK with new KEK
    const newWrappedKey = await wrapKeyRFC3394(
        dek,
        newKEK
    );

    // 9. Hash new PIN
    const newPinHash = await argon2.hash(newPin);

    // 10. Update DB
await pool.query(
    `
    UPDATE "UserKey"
    SET 
        encrypted_key = $1,
        kek_salt = $2,
        rotation_count = rotation_count + 1
    WHERE user_id = $3
    `,
    [
        newWrappedKey,
        newSalt.toString("base64"),
        user_id
    ]
);

    await pool.query(
        `
        UPDATE users
        SET pin_hash = $1
        WHERE id = $2
        `,
        [newPinHash, user_id]
    );

    return {
        success: true,
        message: "PIN changed successfully"
    };
}