import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import { UserRepository } from "./repositories/UserRepository.js";

dotenv.config();

declare module "express-session" {
    interface SessionData { userId: number; }
}

const app = express();
const users = new UserRepository();

app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax" }
}));
app.use(express.static("public"));

app.post("/api/signup", async (req, res) => {
    const { username, email, password } = req.body ?? {};
    if (!username || !email || !password || password.length < 8) {
        res.status(400).json({ error: "Username, email, and an 8+ character password are required." });
        return;
    }
    try {
        const user = await users.createUser(username, email, password);
        req.session.userId = user.getUserId();
        res.status(201).json({ username: user.getUsername() });
    } catch (err: any) {
        if (err?.code === "ER_DUP_ENTRY") {
            res.status(409).json({ error: "That username or email is already taken." });
            return;
        }
        console.error(err);
        res.status(500).json({ error: "Something went wrong." });
    }
});

app.post("/api/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    const user = email && password ? await users.login(email, password) : null;
    if (!user) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
    }
    req.session.userId = user.getUserId();
    res.json({ username: user.getUsername() });
});

app.get("/api/me", async (req, res) => {
    const user = req.session.userId ? await users.findById(req.session.userId) : null;
    if (!user) {
        res.status(401).json({ error: "Not logged in." });
        return;
    }
    res.json({ username: user.getUsername(), email: user.getEmail() });
});

app.post("/api/logout", (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
});

app.listen(3000, () => console.log("Running at http://localhost:3000"));