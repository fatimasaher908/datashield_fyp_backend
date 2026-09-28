import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRouter from "./routes/authRoutes.js";
import keyRouter from "./routes/keyRoutes.js";
import pinRouter from "./routes/pinRoutes.js";
import fileRouter from "./routes/fileRoutes.js";
import mediaRouter from "./routes/mediaRoutes.js";

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: "https://localhost:5173", // React Vite
    credentials: true,
  })
);

app.get("/", (req, res) => {
  res.send("DataShield Backend is running");
});
app.use("/auth", authRouter);
app.use("/key", keyRouter);
app.use("/pin", pinRouter);
app.use("/files", fileRouter);
app.use("/media", mediaRouter);

export default app;