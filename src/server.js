// // Import the Express framework
// import express from "express";
// import dotenv from "dotenv";

// import { connectDB, disconnectDB } from "./db/db.js";
// import authRouter from "./routes/authRoutes.js";
// import cookieParser from "cookie-parser";
// import keyRouter from "./routes/keyRoutes.js";
// import pinRouter from "./routes/pinRoutes.js";


// dotenv.config();

// const app = express();
// app.use(express.json());

// //for storing token in http cookie only to avoid xss
// app.use(cookieParser());


// // API routes
// app.use("/auth", authRouter);
// app.use("/key", keyRouter);
// app.use("/pin", pinRouter);


// // Define the port number on which the server will run (You can use almost any port number between 1024 and 65535, as long as it's not already being used by another application.)
// const PORT = process.env.PORT || 8383;

// // Start the server and listen for incoming requests
// const server = app.listen(PORT, async () => {
//   console.log(`Server started on port ${PORT}`);
//   await connectDB();
// });


// // Handle unhandled promise rejections
// process.on("unhandledRejection", (err) => {
//     console.error("Unhandled Rejection:", err);

//     server.close(async () => {
//         await disconnectDB();
//         process.exit(1);
//     });
// });

// // Handle uncaught exceptions
// process.on("uncaughtException", (err) => {
//     console.error("Uncaught Exception:", err);

//     server.close(async () => {
//         await disconnectDB();
//         process.exit(1);
//     });
// });

// // Handle SIGTERM (graceful shutdown)
// process.on("SIGTERM", () => {
//     console.log("SIGTERM received. Shutting down...");

//     server.close(async () => {
//         await disconnectDB();
//         process.exit(0);
//     });
// });

import https from "https";
import fs from "fs";
import dotenv from "dotenv";

import app from "./app.js";
import { connectDB, disconnectDB } from "./db/db.js";

dotenv.config();

// TLS certificate configuration
const options = {
    key: fs.readFileSync(process.env.SSL_KEY),
    cert: fs.readFileSync(process.env.SSL_CERT),
    // If your CA provides a separate chain file, uncomment this:
    // ca: fs.readFileSync(process.env.SSL_CA),
};

// Port
const PORT = process.env.PORT || 443;

// Create HTTPS server
// const server = https.createServer(options, app);

// // Start server
// server.listen(PORT, async () => {
//     try {
//         await connectDB();
//         console.log(`HTTPS Server running on https://localhost:${PORT}`);
//     } catch (err) {
//         console.error("Database connection failed:", err);
//         process.exit(1);
//     }
// });
const server = https.createServer(options, app);

// Start server
server.listen(PORT, "0.0.0.0", async () => {
    try {
        await connectDB();
        console.log(`HTTPS Server running on https://localhost:${PORT}`);
    } catch (err) {
        console.error("Database connection failed:", err);
        process.exit(1);
    }
});
// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);

    server.close(async () => {
        await disconnectDB();
        process.exit(1);
    });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);

    server.close(async () => {
        await disconnectDB();
        process.exit(1);
    });
});

// Graceful shutdown (SIGTERM)
process.on("SIGTERM", () => {
    console.log("SIGTERM received. Shutting down...");

    server.close(async () => {
        await disconnectDB();
        process.exit(0);
    });
});

// Graceful shutdown (Ctrl + C)
process.on("SIGINT", () => {
    console.log("SIGINT received. Shutting down...");

    server.close(async () => {
        await disconnectDB();
        process.exit(0);
    });
});