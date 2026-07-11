import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// connect function (optional but keeps your structure)
export const connectDB = async () => {
  try {
    //SELECT 1 means:
    //“Give me the number 1”
    //It does NOT read tables
    //It does NOT modify data
    //It is the simplest possible valid SQL query to check connectivity to the database
    await pool.query("SELECT 1");
    console.log("PostgreSQL Connected");
  } catch (err) {
    console.error("DB Connection Error:", err);
    process.exit(1);
  }
};

// graceful shutdown
export const disconnectDB = async () => {
  try {
    await pool.end();
    console.log("PostgreSQL Disconnected");
  } catch (err) {
    console.error("Error disconnecting DB:", err);
  }
};