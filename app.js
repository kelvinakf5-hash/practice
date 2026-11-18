
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const { db, testConnection } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

// ======================================
// CONFIGURATION
// ======================================

if (!process.env.JWT_SECRET) {
    console.error("ERROR: JWT_SECRET is missing from .env");
    process.exit(1);
}

const STUDENTS_TABLE = "`student_portal`.`section`";

// ======================================
// SECURITY
// ======================================

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https:", "data:"]
        }
    }
}));

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5000"
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================================
// FRONTEND
// ======================================

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/register", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "register.html"));
});

// ======================================
// API TEST
// ======================================

app.get("/api", (req, res) => {
    res.json({
        success: true,
        message: "Student Portal API is connected!"
    });
});

// ======================================
// DATABASE TEST
// ======================================

app.get("/api/database", async (req, res) => {
    try {
        const [result] = await db.query(
            "SELECT DATABASE() AS database_name, @@hostname AS server_host, @@port AS server_port"
        );

        res.json({
            success: true,
            database: result[0].database_name,
            server: result[0].server_host,
            port: result[0].server_port
        });

    } catch (error) {
        console.error("Database error:", error.message);

        res.status(500).json({
            success: false,
            message: "Database connection failed."
        });
    }
});

// ======================================
// REGISTER
// ======================================

app.post("/api/auth/register", async (req, res) => {
    try {
        const { full_name, email, password } = req.body;

        if (!full_name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields."
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 8 characters."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // VERIFY EXACT DATABASE AND TABLE
        console.log("\n========== DATABASE INSPECTION ==========");

        const [databaseInfo] = await db.query(`
            SELECT
                DATABASE() AS database_name,
                @@hostname AS server_host,
                @@port AS server_port
        `);

        console.log("Database:", databaseInfo[0].database_name);
        console.log("Server:", databaseInfo[0].server_host);
        console.log("Port:", databaseInfo[0].server_port);

        const [tableInfo] = await db.query(`
            SHOW CREATE TABLE ${STUDENTS_TABLE}
        `);

        console.log("TABLE DEFINITION:");
        console.log(tableInfo[0]["Create Table"]);

        const [columns] = await db.query(`
            SHOW COLUMNS FROM ${STUDENTS_TABLE}
        `);

        console.log("TABLE COLUMNS:");

        columns.forEach(column => {
            console.log(
                column.Field,
                "|",
                column.Type,
                "|",
                column.Null
            );
        });

        const hasFullName = columns.some(
            column => column.Field === "full_name"
        );

        if (!hasFullName) {
            return res.status(500).json({
                success: false,
                message: "The connected section table does not contain full_name. Check the table definition in the terminal."
            });
        }

        console.log("=========================================\n");

        // CHECK EMAIL
        const [existingUser] = await db.query(
            `SELECT id FROM ${STUDENTS_TABLE} WHERE email = ?`,
            [normalizedEmail]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({
                success: false,
                message: "This email is already registered."
            });
        }

        // HASH PASSWORD
        const passwordHash = await bcrypt.hash(password, 12);

        // INSERT STUDENT
        const [result] = await db.query(
            `INSERT INTO ${STUDENTS_TABLE}
            (full_name, email, password_hash)
            VALUES (?, ?, ?)`,
            [
                full_name.trim(),
                normalizedEmail,
                passwordHash
            ]
        );

        console.log("STUDENT REGISTERED. ID:", result.insertId);

        res.status(201).json({
            success: true,
            message: "Registration successful! You can now log in."
        });

    } catch (error) {
        console.error("REGISTRATION ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Registration failed: " + error.message
        });
    }
});

// ======================================
// LOGIN
// ======================================

app.post("/api/auth/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required."
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const [users] = await db.query(
            `SELECT id, full_name, email, password_hash
             FROM ${STUDENTS_TABLE}
             WHERE email = ?`,
            [normalizedEmail]
        );

        if (users.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const student = users[0];

        const passwordMatch = await bcrypt.compare(
            password,
            student.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password."
            });
        }

        const token = jwt.sign(
            {
                id: student.id,
                email: student.email
            },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.json({
            success: true,
            message: "Login successful!",
            token,
            student: {
                id: student.id,
                full_name: student.full_name,
                email: student.email
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Login failed: " + error.message
        });
    }
});

// ======================================
// AUTHENTICATION MIDDLEWARE
// ======================================

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Access denied. Please log in."
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (error, user) => {
        if (error) {
            return res.status(403).json({
                success: false,
                message: "Invalid or expired login session."
            });
        }

        req.user = user;
        next();
    });
}

// ======================================
// STUDENT PROFILE
// ======================================

app.get("/api/auth/me", authenticateToken, async (req, res) => {
    try {
        const [users] = await db.query(
            `SELECT id, full_name, email, created_at
             FROM ${STUDENTS_TABLE}
             WHERE id = ?`,
            [req.user.id]
        );

        if (users.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Student account not found."
            });
        }

        res.json({
            success: true,
            student: users[0]
        });

    } catch (error) {
        console.error("PROFILE ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Could not load student profile."
        });
    }
});

// ======================================
// 404 HANDLER
// ======================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: "Page or API route not found."
    });
});

// ======================================
// START SERVER
// ======================================

async function startServer() {
    try {
        await testConnection();

        app.listen(PORT, () => {
            console.log("----------------------------------");
            console.log("STUDENT PORTAL SERVER RUNNING");
            console.log(`Website: http://localhost:${PORT}`);
            console.log(`Login: http://localhost:${PORT}/login`);
            console.log(`Register: http://localhost:${PORT}/register`);
            console.log(`API: http://localhost:${PORT}/api`);
            console.log(`Database: http://localhost:${PORT}/api/database`);
            console.log("----------------------------------");
        });

    } catch (error) {
        console.error("SERVER FAILED TO START:", error.message);
        process.exit(1);
    }
}

startServer();
