import { pool } from "../db/db.js";

// ============================================================
// REGISTER MEDIA FILE
// ============================================================

const registerMediaFile = async (req, res) => {
    console.log("");
    console.log("==============================================");
    console.log("REGISTER MEDIA REQUEST RECEIVED");
    console.log("==============================================");

    try {
        console.log("REQ.USER =", req.user);
        console.log("REQ.BODY =", req.body);

        const userId = req.user?.id||req.user?.user_id||req.user?.userId;

        console.log("USER ID =", userId);

        if (!userId) {
            console.log("ERROR: user_id missing from JWT");
            
            return res.status(401).json({
                message: "User ID missing from authentication token"
            });
        }

        const {
            original_name,
            encrypted_name,
            mime_type,
            file_size,
            file_hash
        } = req.body;

        console.log("original_name =", original_name);
        console.log("encrypted_name =", encrypted_name);
        console.log("mime_type =", mime_type);
        console.log("file_size =", file_size);
        console.log("file_hash =", file_hash);

        // ========================================================
        // VALIDATION
        // ========================================================

        if (
            !original_name ||
            !encrypted_name ||
            !file_hash
        ) {
            console.log("ERROR: Required field missing");

            return res.status(400).json({
                message: "Missing required file information"
            });
        }

        // ========================================================
        // DATABASE INSERT
        // ========================================================

        console.log("DATABASE: Attempting INSERT...");

        const result = await pool.query(
            `
            INSERT INTO media_files
            (
                user_id,
                original_name,
                encrypted_name,
                file_size,
                mime_type,
                file_hash
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            `,
            [
                userId,
                original_name,
                encrypted_name,
                file_size,
                mime_type || null,
                file_hash
            ]
        );

        console.log("DATABASE: INSERT SUCCESS");
        console.log("DATABASE ROW =", result.rows[0]);

        return res.status(201).json({
            message: "Media file registered successfully",
            file: result.rows[0]
        });

    } catch (error) {
        console.error("");
        console.error("==============================================");
        console.error("REGISTER MEDIA ERROR");
        console.error("==============================================");
        console.error(error);
        console.error("==============================================");

        return res.status(500).json({
            message: "Failed to register media file",
            error: error.message
        });
    }
};


// ============================================================
// GET CURRENT USER MEDIA FILES
// ============================================================

const getUserMediaFiles = async (req, res) => {
    try {
        console.log("GET MEDIA FILES");
        console.log("REQ.USER =", req.user);

        const userId = req.user?.id||req.user?.user_id;

        if (!userId) {
            return res.status(401).json({
                message: "User ID missing from authentication token"
            });
        }

        const result = await pool.query(
            `
            SELECT
                id,
                original_name,
                encrypted_name,
                file_size,
                mime_type,
                file_hash,
                status,
                created_at,
                updated_at
            FROM media_files
            WHERE user_id = $1
            AND status = 'encrypted'
            ORDER BY created_at DESC
            `,
            [userId]
        );

        console.log(
            `FOUND ${result.rows.length} FILES FOR USER ${userId}`
        );

        return res.status(200).json({
            files: result.rows
        });

    } catch (error) {
        console.error("GET MEDIA FILES ERROR:", error);

        return res.status(500).json({
            message: "Failed to retrieve media files"
        });
    }
};


export {
    registerMediaFile,
    getUserMediaFiles
};