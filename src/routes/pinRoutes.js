
import express from "express";
import authenticateUser  from "../middleware/authMiddleware.js";
import { changePin } from "../controller/pinController.js";

const pinRouter = express.Router();

pinRouter.put("/change-pin", authenticateUser, changePin);


export default pinRouter;