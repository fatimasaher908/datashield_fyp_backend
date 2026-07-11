
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { pool } from "../db/db.js";

// ==========================
// Register User
// ==========================
const register = async (req, res) => {
    try {

        // Get user data
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Username, email and password are required."
            });
        }

        // Check if username or email already exists
        const existingUser = await pool.query(
            `SELECT * FROM users
             WHERE email = $1 OR username = $2`,
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Email or username already exists."
            });
        }

        // Hash password using Argon2
        const hashedPassword = await argon2.hash(password);

        // Save user in database
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, username, email, created_at`,
            [username, email, hashedPassword]
        );

        res.status(201).json({
            success: true,
            message: "User registered successfully.",
            user: result.rows[0]
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Internal Server Error"
        });

    }
};

// ==========================
// Login User
// ==========================
const loginUser = async (email, password, req) => {

    const result = await pool.query(
        `SELECT id, username, email, password_hash
         FROM users
         WHERE email = $1`,
        [email]
    );

    if (result.rows.length === 0) return null;

    const user = result.rows[0];

    const valid = await argon2.verify(user.password_hash, password);
    if (!valid) return null;

    const jti = crypto.randomUUID();
     console.log("id: ", user.id, "jti: ", jti);
    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            jti
        },
        process.env.JWT_SECRET,
        { expiresIn: "30m" }
    );

    // store session in DB
    await pool.query(
        `INSERT INTO user_sessions
        (user_id, jti, expires_at, user_agent, ip_address)
        VALUES ($1, $2, NOW() + INTERVAL '30 minutes', $3, $4)`,
        [
            user.id,
            jti,
            req.headers["user-agent"] || null,
            req.ip
        ]
    );

    return { user, token, jti };
};


// =========================
// WEB LOGIN (COOKIE)
// =========================
const loginWeb = async (req, res) => {

    const { email, password } = req.body;

    const data = await loginUser(email, password, req);

    if (!data) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    res.cookie("token", data.token, {
        httpOnly: true,
        secure: true,
       // secure: process.env.NODE_ENV === "production",
       // sameSite: "Strict",
         sameSite: "None",
        maxAge: 30 * 60 * 1000
    });

    return res.json({
        success: true,
       user: data.user
    });
};


// =========================
// MOBILE LOGIN (JWT)
// =========================
const loginMobile = async (req, res) => {

    const { email, password } = req.body;

    const data = await loginUser(email, password, req);

    if (!data) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password"
        });
    }

    return res.json({
        success: true,
        token: data.token,
    //    user: data.user
    });
};


// =========================
// LOGOUT WEB
// =========================
const logoutWeb = async (req, res) => {

    const jti = req.user.jti;

    await pool.query(
        `UPDATE user_sessions
         SET is_revoked = true
         WHERE jti = $1`,
        [jti]
    );

    res.clearCookie("token");

    return res.json({
        success: true,
        message: "Logged out"
    });
};


// =========================
// LOGOUT MOBILE
// =========================
const logoutMobile = async (req, res) => {

    const jti = req.user.jti;

    await pool.query(
        `UPDATE user_sessions
         SET is_revoked = true
         WHERE jti = $1`,
        [jti]
    );

    return res.json({
        success: true,
        message: "Logged out"
    });
};

export {
    register,
    loginWeb,
    loginMobile,
    logoutWeb,
    logoutMobile
};
