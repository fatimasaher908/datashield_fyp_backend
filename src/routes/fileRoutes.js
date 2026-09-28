
import express from "express";
import authenticateUser from "../middleware/authMiddleware.js";
import { pool } from "../db/db.js";

const fileRouter = express.Router();


// ============================================================
// AUTHENTICATION
// ============================================================
//
// Every route in this router requires a valid JWT.
//
// authenticateUser should verify the JWT and set:
//
//     req.user = decoded;
//
// Your JWT contains:
//
//     {
//         id: 27,
//         ...
//     }
//
// Therefore:
//
//     req.user.id
//
// is the authenticated user's ID.
// ============================================================

fileRouter.use(authenticateUser);


// ============================================================
// FLUTTER DEVICE
// ============================================================
//
// IMPORTANT:
// Replace this with the phone's current IP address.
//
// Example:
//
//     http://192.168.137.100:8080
//
// ============================================================

const FLUTTER_DEVICE_URL =
    "http://192.168.137.236:8080";


// ============================================================
// HELPER: GET MIME TYPE
// ============================================================

function getMimeType(fileName) {

    const lower = fileName.toLowerCase();

    // --------------------------------------------------------
    // Remove .dsenc before checking original extension
    // --------------------------------------------------------

    const originalName =
        lower.endsWith(".dsenc")
            ? lower.slice(0, -".dsenc".length)
            : lower;


    // --------------------------------------------------------
    // Images
    // --------------------------------------------------------

    if (
        originalName.endsWith(".jpg") ||
        originalName.endsWith(".jpeg")
    ) {
        return "image/jpeg";
    }

    if (originalName.endsWith(".png")) {
        return "image/png";
    }

    if (originalName.endsWith(".webp")) {
        return "image/webp";
    }

    if (originalName.endsWith(".gif")) {
        return "image/gif";
    }

    if (originalName.endsWith(".bmp")) {
        return "image/bmp";
    }


    // --------------------------------------------------------
    // Videos
    // --------------------------------------------------------

    if (originalName.endsWith(".mp4")) {
        return "video/mp4";
    }

    if (originalName.endsWith(".mov")) {
        return "video/quicktime";
    }

    if (originalName.endsWith(".mkv")) {
        return "video/x-matroska";
    }

    if (originalName.endsWith(".avi")) {
        return "video/x-msvideo";
    }


    return "application/octet-stream";
}


// ============================================================
// GET /files
// ============================================================
//
// Website
//    ↓
// Node.js
//    ↓
// Database → files belonging to authenticated user
//    ↓
// Flutter → files physically existing on phone
//    ↓
// Match using encrypted_name
//    ↓
// Website
//
// IMPORTANT:
//
// The server does NOT simply return every .dsenc file found
// on the phone.
//
// It returns only files that:
//
// 1. Belong to the authenticated user in the database
// 2. Actually exist on the phone
//
// The response contains:
//
//     mediaId
//         = PostgreSQL media_files.id
//
//     physicalFileId
//         = Flutter's physical file ID
//
// These two IDs are NOT assumed to be the same.
// ============================================================

fileRouter.get("/", async (req, res) => {

    try {

        console.log("");
        console.log("========================================");
        console.log("FILES: REQUEST RECEIVED FROM WEBSITE");
        console.log("========================================");


        // ====================================================
        // 1. GET AUTHENTICATED USER ID
        // ====================================================

        console.log(
            "FILES: req.user =",
            req.user
        );

        const userId =
            req.user?.id;

        console.log(
            "FILES: authenticated userId =",
            userId
        );


        if (!userId) {

            console.log(
                "FILES ERROR: User ID missing from JWT"
            );

            return res.status(401).json({

                success: false,

                message:
                    "User ID missing from authentication token"
            });
        }


        // ====================================================
        // 2. GET USER'S REGISTERED FILES FROM DATABASE
        // ====================================================

        console.log("");

        console.log(
            `FILES: Getting database files for user ${userId}`
        );


        const dbResult = await pool.query(
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
            `FILES: Database returned ${dbResult.rows.length} files`
        );


        // ====================================================
        // DEBUG DATABASE FILES
        // ====================================================

        console.log("");
        console.log("FILES: DATABASE FILES");


        dbResult.rows.forEach((file, index) => {

            console.log(
                `---------- DATABASE FILE ${index} ----------`
            );

            console.log(
                "DB media ID:",
                file.id
            );

            console.log(
                "Original name:",
                file.original_name
            );

            console.log(
                "Encrypted name:",
                file.encrypted_name
            );

            console.log(
                "Hash:",
                file.file_hash
            );

            console.log(
                "Status:",
                file.status
            );
        });


        // ====================================================
        // 3. ASK FLUTTER FOR PHYSICAL FILES
        // ====================================================

        console.log("");

        console.log(
            "FILES: Requesting physical encrypted files from Flutter..."
        );


        const response = await fetch(
            `${FLUTTER_DEVICE_URL}/files`
        );


        console.log(
            "FILES: Flutter status =",
            response.status
        );


        // ====================================================
        // FLUTTER ERROR
        // ====================================================

        if (!response.ok) {

            const errorText =
                await response.text();

            console.error(
                "FILES: Flutter returned error:",
                errorText
            );

            return res.status(
                response.status
            ).json({

                success: false,

                message:
                    "Flutter device returned an error.",

                error:
                    errorText
            });
        }


        // ====================================================
        // 4. READ FLUTTER RESPONSE
        // ====================================================

        const flutterFiles =
            await response.json();


        console.log("");

        console.log(
            `FILES: Flutter returned ${flutterFiles.length} physical files`
        );


        // ====================================================
        // DEBUG FLUTTER FILES
        // ====================================================

        console.log("");

        console.log(
            "FILES: PHYSICAL FLUTTER FILES"
        );


        flutterFiles.forEach((file, index) => {

            console.log(
                `---------- FLUTTER FILE ${index} ----------`
            );

            console.log(
                "Flutter physical ID:",
                file.id
            );

            console.log(
                "File name:",
                file.name
            );

            console.log(
                "File size:",
                file.size
            );

            console.log(
                "Is .dsenc:",
                file.name
                    ?.toLowerCase()
                    .endsWith(".dsenc")
            );
        });


        // ====================================================
        // 5. BUILD DATABASE LOOKUP
        //
        // Key:
        //
        //     encrypted_name
        //
        // Value:
        //
        //     complete database record
        //
        // ====================================================

        const registeredFiles =
            new Map();


        for (const dbFile of dbResult.rows) {

            registeredFiles.set(
                dbFile.encrypted_name,
                dbFile
            );
        }


        console.log("");

        console.log(
            `FILES: Created database lookup with ${registeredFiles.size} files`
        );


        // ====================================================
        // 6. COMPARE PHYSICAL FILES WITH DATABASE FILES
        // ====================================================
        //
        // ONLY KEEP A FILE IF:
        //
        //     DB says it belongs to this user
        //
        // AND
        //
        //     It physically exists on the phone.
        //
        // ====================================================

        const matchingFiles =
            flutterFiles.filter((flutterFile) => {

                const encryptedName =
                    flutterFile.name;

                const dbFile =
                    registeredFiles.get(
                        encryptedName
                    );


                // ------------------------------------------------
                // File exists physically but isn't registered
                // for this user.
                // ------------------------------------------------

                if (!dbFile) {

                    console.log(
                        "FILES: IGNORING PHONE FILE:",
                        encryptedName
                    );

                    console.log(
                        "FILES: Reason = Not registered for user",
                        userId
                    );

                    return false;
                }


                // ------------------------------------------------
                // File belongs to current user AND exists
                // physically.
                // ------------------------------------------------

                console.log("");

                console.log(
                    "FILES: MATCH FOUND:",
                    encryptedName
                );

                console.log(
                    "FILES: Database media ID:",
                    dbFile.id
                );

                console.log(
                    "FILES: Flutter physical ID:",
                    flutterFile.id
                );


                return true;
            });


        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            `FILES: MATCHING FILES = ${matchingFiles.length}`
        );

        console.log(
            "========================================"
        );


        // ====================================================
        // 7. CONVERT MATCHED FILES TO WEBSITE FORMAT
        // ====================================================
        //
        // IMPORTANT:
        //
        // physicalFileId = Flutter ID
        //
        // mediaId = Database ID
        //
        // They are intentionally separate.
        // ====================================================

        const files =
            matchingFiles.map((flutterFile) => {

                const dbFile =
                    registeredFiles.get(
                        flutterFile.name
                    );


                // ------------------------------------------------
                // Remove .dsenc from fallback display name
                // ------------------------------------------------

                const originalName =
                    flutterFile.name
                        .toLowerCase()
                        .endsWith(".dsenc")
                        ? flutterFile.name.substring(
                            0,
                            flutterFile.name.length -
                            ".dsenc".length
                        )
                        : flutterFile.name;


              return {
    // PostgreSQL media_files.id
    id:
        dbFile.id,

    // Flutter physical file ID
    physicalFileId:
        flutterFile.id,

    name:
        dbFile.original_name ||
        originalName,

    encryptedName:
        dbFile.encrypted_name,

    size:
        flutterFile.size,

    type:
        dbFile.mime_type ||
        getMimeType(originalName),

    fileHash:
        dbFile.file_hash
};
            });


        // ====================================================
        // 8. SEND ONLY MATCHING FILES TO WEBSITE
        // ====================================================

        console.log("");

        console.log(
            "FILES: FINAL FILE LIST SENT TO WEBSITE"
        );

        console.log(
            files
        );


        return res.status(200).json({

            success: true,

            user_id:
                userId,

            files:
                files
        });


    } catch (error) {

        console.error("");

        console.error(
            "========================================"
        );

        console.error(
            "FILES: ERROR COMMUNICATING WITH FLUTTER"
        );

        console.error(
            "========================================"
        );

        console.error(error);


        return res.status(500).json({

            success: false,

            message:
                "Could not retrieve user's encrypted files.",

            error:
                error.message
        });
    }
});


// ============================================================
// GET /files/:id
// ============================================================
//
// IMPORTANT:
//
// The :id here is the DATABASE media ID.
//
// Example:
//
// Website requests:
//
//     GET /files/5
//
// Database:
//
//     media_files.id = 5
//
// Flutter may have:
//
//     physical file ID = 3
//
// Therefore:
//
//     DB media ID 5
//             ↓
//     Find encrypted_name
//             ↓
//     Search Flutter /files
//             ↓
//     Find physical ID 3
//             ↓
//     Request Flutter /files/3
//
// NEVER assume:
//
//     database ID === Flutter physical ID
//
// ============================================================

fileRouter.get("/:id", async (req, res) => {

    try {

        const userId =
            req.user?.id;


        console.log("");

        console.log(
            "========================================"
        );

        console.log(
            "FILES: SINGLE FILE REQUEST"
        );

        console.log(
            "========================================"
        );

        console.log(
            "FILES: Authenticated userId =",
            userId
        );


        // ====================================================
        // 1. CHECK AUTHENTICATED USER
        // ====================================================

        if (!userId) {

            console.log(
                "FILES ERROR: User ID missing from JWT"
            );

            return res.status(401).json({

                success: false,

                message:
                    "User ID missing from authentication token"
            });
        }


        // ====================================================
        // 2. GET REQUESTED DATABASE MEDIA ID
        // ====================================================

        const { id } =
            req.params;


        console.log(
            "FILES: Requested DATABASE media ID =",
            id
        );


        // ====================================================
        // 3. VALIDATE DATABASE MEDIA ID
        // ====================================================

        const mediaId =
            Number(id);


        if (
            !Number.isInteger(mediaId) ||
            mediaId <= 0
        ) {

            console.log(
                "FILES ERROR: Invalid database media ID"
            );

            return res.status(400).json({

                success: false,

                message:
                    "Invalid file ID"
            });
        }


        // ====================================================
        // 4. CHECK DATABASE OWNERSHIP
        // ====================================================
        //
        // IMPORTANT:
        //
        // There is NO "id + 1" here.
        //
        // The requested ID is already the database ID.
        //
        // ====================================================

        console.log("");

        console.log(
            "FILES: Checking database ownership..."
        );


        const dbResult =
            await pool.query(
                `
                SELECT
                    id,
                    user_id,
                    original_name,
                    encrypted_name,
                    file_size,
                    mime_type,
                    file_hash,
                    status
                FROM media_files
                WHERE id = $1
                  AND user_id = $2
                  AND status = 'encrypted'
                LIMIT 1
                `,
                [
                    mediaId,
                    userId
                ]
            );


        // ====================================================
        // 5. FILE DOES NOT BELONG TO USER
        // ====================================================

        if (
            dbResult.rows.length === 0
        ) {

            console.log("");

            console.log(
                "FILES: ACCESS DENIED"
            );

            console.log(
                `FILES: Database media ID ${mediaId} does not belong to user ${userId}`
            );


            return res.status(404).json({

                success: false,

                message:
                    "File not found for this user"
            });
        }


        // ====================================================
        // 6. DATABASE OWNERSHIP VERIFIED
        // ====================================================

        const dbFile =
            dbResult.rows[0];


        console.log("");

        console.log(
            "FILES: DATABASE OWNERSHIP VERIFIED"
        );

        console.log(
            "FILES: Database media ID =",
            dbFile.id
        );

        console.log(
            "FILES: Database user ID =",
            dbFile.user_id
        );

        console.log(
            "FILES: Original name =",
            dbFile.original_name
        );

        console.log(
            "FILES: Encrypted name =",
            dbFile.encrypted_name
        );


        // ====================================================
        // 7. ASK FLUTTER FOR PHYSICAL FILE LIST
        // ====================================================
        //
        // We cannot use dbFile.id here because Flutter has
        // its own physical file IDs.
        //
        // Example:
        //
        // DB media ID       = 5
        // Flutter file ID   = 3
        //
        // We therefore locate the Flutter file by its
        // encrypted filename.
        //
        // ====================================================

        console.log("");

        console.log(
            "FILES: Requesting physical file list from Flutter..."
        );


        const flutterListResponse =
            await fetch(
                `${FLUTTER_DEVICE_URL}/files`
            );


        console.log(
            "FILES: Flutter list status =",
            flutterListResponse.status
        );


        // ====================================================
        // FLUTTER LIST ERROR
        // ====================================================

        if (!flutterListResponse.ok) {

            const errorText =
                await flutterListResponse.text();


            console.error(
                "FILES: Flutter list error:",
                errorText
            );


            return res.status(502).json({

                success: false,

                message:
                    "Could not retrieve physical files from Flutter.",

                error:
                    errorText
            });
        }


        // ====================================================
        // 8. READ FLUTTER FILE LIST
        // ====================================================

        const flutterFiles =
            await flutterListResponse.json();


        console.log("");

        console.log(
            `FILES: Flutter returned ${flutterFiles.length} physical files`
        );


        // ====================================================
        // 9. FIND PHYSICAL FILE USING ENCRYPTED NAME
        // ====================================================

        const flutterFile =
            flutterFiles.find(
                file =>
                    file.name ===
                    dbFile.encrypted_name
            );


        // ====================================================
        // 10. PHYSICAL FILE NOT FOUND
        // ====================================================

        if (!flutterFile) {

            console.log("");

            console.log(
                "FILES: PHYSICAL FILE NOT FOUND"
            );

            console.log(
                "FILES: Database encrypted name =",
                dbFile.encrypted_name
            );


            return res.status(404).json({

                success: false,

                message:
                    "Encrypted file is registered but was not found on the device."
            });
        }


        // ====================================================
        // 11. PHYSICAL FILE FOUND
        // ====================================================

        console.log("");

        console.log(
            "FILES: PHYSICAL FILE FOUND"
        );

        console.log(
            "FILES: Database media ID =",
            dbFile.id
        );

        console.log(
            "FILES: Flutter physical ID =",
            flutterFile.id
        );

        console.log(
            "FILES: Flutter encrypted name =",
            flutterFile.name
        );

        console.log(
            "FILES: Flutter file size =",
            flutterFile.size
        );


        // ====================================================
        // 12. REQUEST ACTUAL FILE FROM FLUTTER
        // ====================================================
        //
        // IMPORTANT:
        //
        // Use:
        //
        //     flutterFile.id
        //
        // NOT:
        //
        //     dbFile.id
        //
        // NOT:
        //
        //     req.params.id
        //
        // ====================================================

        console.log("");

        console.log(
            `FILES: Requesting physical Flutter file ${flutterFile.id}`
        );


        const response =
            await fetch(
                `${FLUTTER_DEVICE_URL}/files/${encodeURIComponent(
                    flutterFile.id
                )}`
            );


        console.log(
            "FILES: Flutter file response status =",
            response.status
        );


        // ====================================================
        // 13. FLUTTER COULD NOT PROVIDE FILE
        // ====================================================

        if (!response.ok) {

            const errorText =
                await response.text();


            console.error(
                "FILES: Flutter file error:",
                errorText
            );


            return res.status(
                response.status
            ).json({

                success: false,

                message:
                    "Flutter could not provide the physical file.",

                error:
                    errorText
            });
        }


        // ====================================================
        // 14. CONTENT DISPOSITION
        // ====================================================

        const contentDisposition =
            response.headers.get(
                "content-disposition"
            );


        if (contentDisposition) {

            res.setHeader(
                "Content-Disposition",
                contentDisposition
            );
        }


        // ====================================================
        // 15. CONTENT TYPE
        // ====================================================

        res.setHeader(
            "Content-Type",
            response.headers.get(
                "content-type"
            ) ||
            "application/octet-stream"
        );


        // ====================================================
        // 16. READ ENCRYPTED BYTES
        // ====================================================

        const arrayBuffer =
            await response.arrayBuffer();


        const buffer =
            Buffer.from(arrayBuffer);


        console.log(
            `FILES: Received ${buffer.length} encrypted bytes from Flutter`
        );


        // ====================================================
        // 17. SEND ENCRYPTED BYTES TO WEBSITE
        // ====================================================

        res.setHeader(
            "Content-Length",
            buffer.length
        );


        res.status(200).send(
            buffer
        );


        console.log("");

        console.log(
            `FILES: Successfully sent database media ID ${dbFile.id}`
        );

        console.log(
            `FILES: Physical Flutter ID was ${flutterFile.id}`
        );

        console.log(
            "========================================"
        );


    } catch (error) {

        console.error("");

        console.error(
            "========================================"
        );

        console.error(
            "FILES: ERROR RETRIEVING FILE"
        );

        console.error(
            "========================================"
        );

        console.error(error);


        return res.status(500).json({

            success: false,

            message:
                "Could not retrieve file from Flutter.",

            error:
                error.message
        });
    }
});


export default fileRouter;
