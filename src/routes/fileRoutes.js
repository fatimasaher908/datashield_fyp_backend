import express from "express";
import fs from "fs";
import path from "path";

import authenticateUser from "../middleware/authMiddleware.js";

const fileRouter = express.Router();

// Temporary test files
const testFiles = {
    photo1: {
        name: "Vacation.jpg",
        type: "image/jpeg",
        path: path.join(process.cwd(), "test-files", "photo1.jpg")
    },

    photo2: {
        name: "Family.png",
        type: "image/png",
        path: path.join(process.cwd(), "test-files", "photo2.jpeg")
    },

    video1: {
        name: "Video.mp4",
        type: "video/mp4",
        path: path.join(process.cwd(), "test-files", "video1.mp4")
    }
};


// GET ALL FILES
// Website requests this to get the available files
fileRouter.get("/", authenticateUser, (req, res) => {

    const files = Object.entries(testFiles).map(([id, file]) => ({
        id: id,
        name: file.name,
        type: file.type
    }));

    res.json({
        success: true,
        user_id: req.user.user_id,
        files: files
    });
});


// GET / STREAM A SPECIFIC FILE
fileRouter.get("/:id", authenticateUser, (req, res) => {

    const file = testFiles[req.params.id];

    if (!file) {
        return res.status(404).json({
            success: false,
            message: "File not found"
        });
    }

    if (!fs.existsSync(file.path)) {
        return res.status(404).json({
            success: false,
            message: "Test file does not exist on server"
        });
    }

    res.setHeader("Content-Type", file.type);
    res.setHeader("Content-Disposition", `inline; filename="${file.name}"`);

    // Stream the file directly to the website
    const stream = fs.createReadStream(file.path);

    stream.on("error", (error) => {
        console.error("File streaming error:", error);

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: "Error streaming file"
            });
        }
    });

    stream.pipe(res);
});


export default fileRouter;