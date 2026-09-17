import express from "express";
import {
    createKey,
    getUserKey,
    rotationCountController,
    revokeStatusController,
    revokeKeyController,
    restoreKeyController
} from "../controller/keyController.js";

import authenticateUser from "../middleware/authMiddleware.js";

const keyRouter = express.Router();

// create AES key + store wrapped
keyRouter.post("/create", createKey);

// GET rotation count
keyRouter.get("/rotation", authenticateUser, rotationCountController);

// GET revoke status
keyRouter.get("/revoked", authenticateUser,revokeStatusController);

// PUT revoke key
keyRouter.put("/revoke-key", authenticateUser, revokeKeyController);

// PUT restore key
keyRouter.put("/restore-key", authenticateUser, restoreKeyController);

// fetch wrapped key
keyRouter.get("/:user_id", authenticateUser, getUserKey);

export default keyRouter;