
import mariadb from "mariadb";
import dotenv from "dotenv";

dotenv.config();

const dbPassword = process.env.DB_PASSWORD;

if (!dbPassword) {
    throw new Error("DB_PASSWORD is missing from the .env file");
}

const pool = mariadb.createPool({
    host: "127.0.0.1",
    port: 3306,
    user: "recipe_user",
    password: dbPassword,
    database: "recipe_tracker",
    connectionLimit: 5
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

export default pool;
