import express from "express";
import {
    createKey,
    getUserKey,
    rotationCountController,
    revokeStatusController,
    revokeKeyController
} from "../controller/keyController.js";

import authenticateUser from "../middleware/authMiddleware.js";

const keyRouter = express.Router();

// create AES key + store wrapped
keyRouter.post("/create", authenticateUser,createKey);

// GET rotation count
keyRouter.get("/rotation", authenticateUser, rotationCountController);

// GET revoke status
keyRouter.get("/revoked", authenticateUser,revokeStatusController);

keyRouter.put("/revoke-key", authenticateUser, revokeKeyController);

// fetch wrapped key
keyRouter.get("/:user_id", authenticateUser, getUserKey);

export default keyRouter;