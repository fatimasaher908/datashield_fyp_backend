import express from "express";
import {
    register,
    loginWeb,
    loginMobile,
    logoutWeb,
    logoutMobile
} from "../controller/authController.js";

import authenticateUser from "../middleware/authMiddleware.js";

const authRouter = express.Router();

//register
authRouter.post("/register", register);


// LOGIN
authRouter.post("/login/web", loginWeb);
authRouter.post("/login/mobile", loginMobile);


// LOGOUT (protected)
authRouter.post("/logout/web",authenticateUser,logoutWeb);
authRouter.post("/logout/mobile", authenticateUser, logoutMobile);


export default authRouter;