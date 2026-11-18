hello
require("dotenv").config();

const mysql = require("mysql2/promise");

const requiredSettings = [
    "DB_HOST",
    "DB_USER",
    "DB_PASSWORD",
    "DB_NAME"
];

for (const setting of requiredSettings) {
    if (!process.env[setting]) {
        throw new Error(`${setting} is missing from your .env file`);
    }
}

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0
});

async function testConnection() {
    let connection;

    try {
        connection = await db.getConnection();

        const [rows] = await connection.query(
            "SELECT DATABASE() AS database_name"
        );

        console.log("MYSQL DATABASE CONNECTED SUCCESSFULLY!");
        console.log("Connected database:", rows[0].database_name);

        return true;

    } catch (error) {
        console.error("MYSQL CONNECTION ERROR:", error.message);
        throw error;

    } finally {
        if (connection) {
            connection.release();
        }
    }
}

module.exports = {
    db,
    testConnection
};
