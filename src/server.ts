import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import { UserRepository } from "./repositories/UserRepository.js";
import { LibraryRepository } from "./repositories/LibraryRepository.js";
import { ensureSchema } from "./database.js";

dotenv.config();

declare module "express-session" {
    interface SessionData { userId: number; }
}

const app = express();
const users = new UserRepository();
const library = new LibraryRepository();

// Board cover photos are sent as images inside the JSON, so allow bigger requests
app.use(express.json({ limit: "15mb" }));
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

// =========================================
// Recipes and boards
// =========================================

// Blocks the request unless someone is logged in
function requireLogin(req: express.Request, res: express.Response, next: express.NextFunction): void {
    if (!req.session.userId) {
        res.status(401).json({ error: "Not logged in." });
        return;
    }
    next();
}

// All of the logged-in user's saved recipes and boards
app.get("/api/library", requireLogin, async (req, res) => {
    res.json(await library.getLibrary(req.session.userId!));
});

// Save the logged-in user's recipes and boards
app.put("/api/library", requireLogin, async (req, res) => {
    try {
        await library.saveLibrary(req.session.userId!, req.body ?? {});
        res.json({ ok: true });
    } catch (err: any) {
        console.error(err);
        res.status(400).json({ error: err?.message ?? "Could not save your recipes." });
    }
});

// Recipes from other users' Shared boards (shown on the Search page)
app.get("/api/community-recipes", requireLogin, async (req, res) => {
    res.json(await library.getCommunityRecipes(req.session.userId!));
});

// Create (or reuse) a share link for one of your recipes or boards
app.post("/api/share", requireLogin, async (req, res) => {
    const { type, key } = req.body ?? {};
    if ((type !== "recipe" && type !== "board") || key === undefined || key === "") {
        res.status(400).json({ error: "Tell me what to share." });
        return;
    }

    const token = await library.getShareToken(req.session.userId!, type, String(key));
    if (!token) {
        res.status(404).json({ error: "That item hasn't been saved yet. Try again in a moment." });
        return;
    }

    res.json({ url: `${req.protocol}://${req.get("host")}/share.html?t=${token}` });
});

// Anyone with a share link can view what it points to (no login needed)
app.get("/api/shared/:token", async (req, res) => {
    const item = await library.getShared(req.params.token);
    if (!item) {
        res.status(404).json({ error: "This share link doesn't exist anymore." });
        return;
    }
    res.json(item);
});

// Make sure the database tables exist, then start the server
ensureSchema()
    .then(() => {
        app.listen(3000, () => console.log("Running at http://localhost:3000"));
    })
    .catch((err) => {
        console.error("Could not set up the database. Is Docker running?", err);
        process.exit(1);
    });