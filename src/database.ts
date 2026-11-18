
import mariadb from "mariadb";
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";

dotenv.config();

const dbPassword = process.env.DB_PASSWORD;

if (!dbPassword) {
    throw new Error("DB_PASSWORD is missing from the .env file");
}

// Locally this connects to the Docker database. When the site is hosted,
// set DB_HOST, DB_PORT, DB_USER, DB_NAME and DB_SSL=true in the host's settings.
const pool = mariadb.createPool({
    host: process.env.DB_HOST ?? "127.0.0.1",
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER ?? "recipe_user",
    password: dbPassword,
    database: process.env.DB_NAME ?? "recipe_tracker",
    connectionLimit: 5,
    ...(process.env.DB_SSL === "true" ? { ssl: { rejectUnauthorized: true } } : {})
});

export async function testConnection(): Promise<void> {
    let connection;

    try {
        connection = await pool.getConnection();

        console.log("Successfully connected to MariaDB!");

        const rows = await connection.query(
            "SELECT VERSION() AS version"
        );

        console.log("MariaDB version:", rows[0].version);

    } catch (error) {
        console.error("Database connection failed:", error);
        throw error;

    } finally {
        if (connection) {
            connection.release();
        }
    }
}

// Creates any missing tables from sql/schema.sql when the server starts,
// so nobody has to run the schema by hand after pulling new tables.
export async function ensureSchema(): Promise<void> {
    const sql = await readFile(new URL("../sql/schema.sql", import.meta.url), "utf8");

    const statements = sql
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .split(";")
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0);

    for (const statement of statements) {
        await pool.query(statement);
    }
}

export default pool;
