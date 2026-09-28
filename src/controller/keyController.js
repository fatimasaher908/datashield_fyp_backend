import { pool } from "../db/db.js";
import { createKeyService,generateAESKey, getRotationCount, isKeyRevoked, revokeKeyService ,restoreKeyService} from "../services/keyServices.js";



// Controller to create a new AES key for a user
export async function createKey(req, res) {
    try {
        const { user_id, pin } = req.body;

        const result = await createKeyService(user_id, pin);

        res.json({
            message: "Key created successfully",
            data: result
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: err.message || "Failed to create key."
        });
    }
}


// fetch wrapped key
export async function getUserKey(req, res) {
    try {
        const { user_id } = req.params;
const result = await pool.query(
    `SELECT encrypted_key, kek_salt, rotation_count, is_revoked, created_at
     FROM "UserKey"
     WHERE user_id = $1`,
    [user_id]
);

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "User key not found"
            });
        }

        const keyData = result.rows[0];

       
        if (keyData.is_revoked) {
            return res.status(403).json({
                error: "Key has been revoked"
            });
        }

        res.json({
            user_id,
            encrypted_key: keyData.encrypted_key,
            kek_salt: keyData.kek_salt,
          //  rotation_count: keyData.rotation_count,
           // created_at: keyData.created_at
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Failed to fetch user key"
        });
    }
}

// fetch rotation count for a user
export async function rotationCountController(req, res) {
    try {

        const user_id = req.user.id;

        const count = await getRotationCount(user_id);

        if (count === null) {
            return res.status(404).json({
                error: "User key not found"
            });
        }

        res.json({
            rotation_count: count
        });

    } catch (err) {
        console.error(err);

        res.status(500).json({
            error: "Failed to get rotation count"
        });
    }
}

// check if key is revoked for a user
export async function revokeStatusController(req, res) {
    try {
        const user_id = req.user.id;

        const revoked = await isKeyRevoked(user_id);

        if (revoked === null) {
            return res.status(404).json({
                error: "User key not found"
            });
        }

        res.json({
            user_id,
            is_revoked: revoked
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            error: "Failed to check revoke status"
        });
    }
}
// Controller to revoke a user's key
export const revokeKeyController = async (req, res) => {
    try {

        const user_id = req.user.id;
        console.log("Revoking key for user_id:", user_id);

        const result = await revokeKeyService(user_id);

        return res.json(result);

    } catch (err) {
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || "Failed to revoke key"
        });
    }
};
// Controller to restore a user's key
export const restoreKeyController = async (req, res) => {
    try {

        const user_id = req.user.id;
        console.log("Restoring key for user_id:", user_id);

        const result = await restoreKeyService(user_id);

        return res.json(result);

    } catch (err) {
        return res.status(err.status || 500).json({
            success: false,
            message: err.message || "Failed to restore key"
        });
    }
};