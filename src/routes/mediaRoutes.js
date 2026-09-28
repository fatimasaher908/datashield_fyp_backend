import express from "express";
import {
    registerMediaFile,
    getUserMediaFiles
} from "../controller/mediaController.js";
import authenticateUser from "../middleware/authMiddleware.js";

const mediaRouter = express.Router();

mediaRouter.post("/register",authenticateUser, registerMediaFile);
mediaRouter.get("/fetch", authenticateUser, getUserMediaFiles);

export default mediaRouter;