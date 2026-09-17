import jwt from "jsonwebtoken";
import { pool } from "../db/db.js";

const authenticateUser = async (req, res, next) => {

    let token = null;

    // =========================
    // 1. MOBILE (Bearer Token)
    // =========================
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
    }

    // =========================
    // 2. WEB (Cookie)
    // =========================
    if (!token && req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "No token provided"
        });
    }

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // =========================
        // SESSION VALIDATION (JTI)
        // =========================
        const session = await pool.query(
            `SELECT * FROM user_sessions
             WHERE jti = $1`,
            [decoded.jti]
        );
     //   console.log("decoded.jti: ", decoded.jti, "with id ", decoded.id);

        if (session.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Session expired or revoked"
            });
        }

        req.user = decoded;

        next();

    } catch (err) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

export default authenticateUser;