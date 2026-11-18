import express from "express";
import session from "express-session";
import dotenv from "dotenv";
import { UserRepository } from "./repositories/UserRepository.js";
import { LibraryRepository } from "./repositories/LibraryRepository.js";
import { SocialRepository } from "./repositories/SocialRepository.js";
import { DatabaseSessionStore } from "./sessionStore.js";
import { ensureSchema } from "./database.js";

dotenv.config();

declare module "express-session" {
    interface SessionData { userId: number; }
}

const app = express();
const users = new UserRepository();
const library = new LibraryRepository();
const social = new SocialRepository();

// Hosts like Render sit in front of the app and handle HTTPS
app.set("trust proxy", 1);

// A few standard security headers
app.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "same-origin");
    next();
});

// Photos are sent as images inside the JSON, so allow bigger requests
app.use(express.json({ limit: "15mb" }));

if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET is not set. Add it to .env (and to the host's settings when deployed).");
}

app.use(session({
    secret: process.env.SESSION_SECRET ?? "dev-secret-change-me",
    store: new DatabaseSessionStore(),
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: "auto",               // secure cookies whenever the site is on HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000 // stay logged in for a week
    }
}));

app.use(express.static("public"));


// =========================================
// Helpers
// =========================================

// Blocks the request unless someone is logged in
function requireLogin(req: express.Request, res: express.Response, next: express.NextFunction): void {
    if (!req.session.userId) {
        res.status(401).json({ error: "Not logged in." });
        return;
    }
    next();
}

function userId(req: express.Request): number {
    return req.session.userId!;
}

// Stops people from guessing passwords: 5 failed tries per email/IP, then wait 15 minutes
const failedLogins = new Map<string, { count: number; until: number }>();

function loginKey(req: express.Request, email: string): string {
    return `${req.ip}|${email.toLowerCase()}`;
}

function isLockedOut(key: string): boolean {
    const entry = failedLogins.get(key);
    return Boolean(entry && entry.count >= 5 && entry.until > Date.now());
}

function recordFailedLogin(key: string): void {
    const entry = failedLogins.get(key);
    const count = entry && entry.until > Date.now() ? entry.count + 1 : 1;
    failedLogins.set(key, { count, until: Date.now() + 15 * 60 * 1000 });
}

// Logs someone in with a fresh session id (prevents session fixation attacks)
function startSession(req: express.Request, id: number): Promise<void> {
    return new Promise((resolve, reject) => {
        req.session.regenerate((err) => {
            if (err) {
                reject(err);
                return;
            }
            req.session.userId = id;
            req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
        });
    });
}


// =========================================
// Accounts
// =========================================

app.post("/api/signup", async (req, res) => {
    const { username, email, password } = req.body ?? {};

    if (typeof username !== "string" || !/^[A-Za-z0-9_.-]{3,30}$/.test(username)) {
        res.status(400).json({ error: "Usernames are 3-30 letters, numbers, dots, dashes or underscores." });
        return;
    }
    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 100) {
        res.status(400).json({ error: "Enter a valid email address." });
        return;
    }
    if (typeof password !== "string" || password.length < 8 || password.length > 200) {
        res.status(400).json({ error: "Passwords need at least 8 characters." });
        return;
    }

    try {
        const user = await users.createUser(username, email, password);
        await startSession(req, user.getUserId());
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
    if (typeof email !== "string" || typeof password !== "string") {
        res.status(400).json({ error: "Enter your email and password." });
        return;
    }

    const key = loginKey(req, email);
    if (isLockedOut(key)) {
        res.status(429).json({ error: "Too many failed attempts. Try again in 15 minutes." });
        return;
    }

    const user = await users.login(email, password);
    if (!user) {
        recordFailedLogin(key);
        res.status(401).json({ error: "Invalid email or password." });
        return;
    }

    failedLogins.delete(key);
    await startSession(req, user.getUserId());
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

app.post("/api/account/password", requireLogin, async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 200) {
        res.status(400).json({ error: "New passwords need at least 8 characters." });
        return;
    }

    const changed = await users.changePassword(userId(req), String(currentPassword ?? ""), newPassword);
    if (!changed) {
        res.status(400).json({ error: "Your current password is wrong." });
        return;
    }
    res.json({ ok: true });
});

app.post("/api/account/delete", requireLogin, async (req, res) => {
    const deleted = await users.deleteAccount(userId(req), String(req.body?.password ?? ""));
    if (!deleted) {
        res.status(400).json({ error: "That password is wrong." });
        return;
    }
    req.session.destroy(() => res.json({ ok: true }));
});


// =========================================
// Recipes, boards and personal data
// =========================================

// Per-user settings the pages are allowed to save
const USER_DATA_KEYS = ["plannedRecipes", "profileDisplayName", "profilePicture", "groceryChecks"];

// All of the logged-in user's saved recipes, boards and settings
app.get("/api/library", requireLogin, async (req, res) => {
    const [data, userData, me] = await Promise.all([
        library.getLibrary(userId(req)),
        social.getUserData(userId(req)),
        users.findById(userId(req))
    ]);
    res.json({ ...data, userData, username: me?.getUsername() ?? "" });
});

// Save the logged-in user's recipes and boards
app.put("/api/library", requireLogin, async (req, res) => {
    try {
        await library.saveLibrary(userId(req), req.body ?? {});
        res.json({ ok: true });
    } catch (err: any) {
        console.error(err);
        res.status(400).json({ error: err?.message ?? "Could not save your recipes." });
    }
});

// Save one setting (planner, display name, profile picture, grocery checkmarks)
app.put("/api/userdata/:key", requireLogin, async (req, res) => {
    const key = String(req.params.key);
    const value = req.body?.value;

    if (!USER_DATA_KEYS.includes(key)) {
        res.status(400).json({ error: "Unknown setting." });
        return;
    }
    if (value !== null && (typeof value !== "string" || value.length > 5_000_000)) {
        res.status(400).json({ error: "That setting is too large." });
        return;
    }

    await social.setUserData(userId(req), key, value);
    res.json({ ok: true });
});


// =========================================
// Sharing
// =========================================

// Recipes from other users' Shared boards (shown on the Search page)
app.get("/api/community-recipes", requireLogin, async (req, res) => {
    res.json(await library.getCommunityRecipes(userId(req)));
});

// Create (or reuse) a share link for one of your recipes or boards
app.post("/api/share", requireLogin, async (req, res) => {
    const { type, key } = req.body ?? {};
    if ((type !== "recipe" && type !== "board") || key === undefined || key === "") {
        res.status(400).json({ error: "Tell me what to share." });
        return;
    }

    const token = await library.getShareToken(userId(req), type, String(key));
    if (!token) {
        res.status(404).json({ error: "That item hasn't been saved yet. Try again in a moment." });
        return;
    }

    res.json({ url: `${req.protocol}://${req.get("host")}/share.html?t=${token}` });
});

// Anyone with a share link can view what it points to (no login needed)
app.get("/api/shared/:token", async (req, res) => {
    const item = await library.getShared(String(req.params.token));
    if (!item) {
        res.status(404).json({ error: "This share link doesn't exist anymore." });
        return;
    }
    res.json(item);
});


// =========================================
// Reviews
// =========================================

// Reviews on a shared recipe (works without logging in for share links)
app.get("/api/recipes/:id/reviews", async (req, res) => {
    const summary = await social.getReviews(Number(req.params.id), req.session.userId ?? null);
    if (!summary) {
        res.status(404).json({ error: "Recipe not found." });
        return;
    }
    res.json(summary);
});

// Reviews other people left on one of your recipes
app.get("/api/my-recipe-reviews", requireLogin, async (req, res) => {
    const summary = await social.getReviewsForMyRecipe(userId(req), String(req.query.name ?? ""));
    res.json(summary ?? { averageStars: null, reviewCount: 0, reviews: [], canReview: false });
});

app.post("/api/recipes/:id/reviews", requireLogin, async (req, res) => {
    const stars = Math.round(Number(req.body?.stars));
    const comment = String(req.body?.comment ?? "").trim().slice(0, 1000);

    if (!(stars >= 1 && stars <= 5)) {
        res.status(400).json({ error: "Pick 1 to 5 stars." });
        return;
    }

    const error = await social.saveReview(Number(req.params.id), userId(req), stars, comment);
    if (error) {
        res.status(400).json({ error });
        return;
    }
    res.json({ ok: true });
});

app.delete("/api/recipes/:id/reviews", requireLogin, async (req, res) => {
    await social.deleteReview(Number(req.params.id), userId(req));
    res.json({ ok: true });
});


// =========================================
// Collaborators
// =========================================

// Who you've added to one of your boards (board id = the id used in the browser)
app.get("/api/boards/:clientId/members", requireLogin, async (req, res) => {
    const members = await social.listMembers(userId(req), String(req.params.clientId));
    if (!members) {
        res.status(404).json({ error: "That board hasn't been saved yet. Try again in a moment." });
        return;
    }
    res.json(members);
});

app.post("/api/boards/:clientId/members", requireLogin, async (req, res) => {
    const username = String(req.body?.username ?? "").trim();
    if (!username) {
        res.status(400).json({ error: "Enter a username." });
        return;
    }

    const error = await social.addMember(userId(req), String(req.params.clientId), username);
    if (error) {
        res.status(400).json({ error });
        return;
    }
    res.json({ ok: true });
});

app.delete("/api/boards/:clientId/members/:username", requireLogin, async (req, res) => {
    await social.removeMember(userId(req), String(req.params.clientId), String(req.params.username));
    res.json({ ok: true });
});

// Boards you share with collaborators (yours and ones you were added to)
app.get("/api/collab-boards", requireLogin, async (req, res) => {
    res.json(await social.getCollaborativeBoards(userId(req)));
});

app.post("/api/collab-boards/:boardId/recipes", requireLogin, async (req, res) => {
    const error = await social.addRecipeToBoard(
        userId(req), Number(req.params.boardId), String(req.body?.name ?? "")
    );
    if (error) {
        res.status(400).json({ error });
        return;
    }
    res.json({ ok: true });
});

app.delete("/api/collab-boards/:boardId/recipes/:recipeId", requireLogin, async (req, res) => {
    const error = await social.removeRecipeFromBoard(
        userId(req), Number(req.params.boardId), Number(req.params.recipeId)
    );
    if (error) {
        res.status(400).json({ error });
        return;
    }
    res.json({ ok: true });
});

// Everyone you share a board with (Dashboard)
app.get("/api/collaborators", requireLogin, async (req, res) => {
    res.json(await social.getCollaborators(userId(req)));
});


// =========================================
// Errors and startup
// =========================================

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(err);
    if (err?.type === "entity.too.large") {
        res.status(413).json({ error: "That's too large to save. Try a smaller photo." });
        return;
    }
    res.status(500).json({ error: "Something went wrong on the server." });
});

const port = Number(process.env.PORT) || 3000;

// Make sure the database tables exist, then start the server
ensureSchema()
    .then(() => {
        app.listen(port, () => console.log(`Running at http://localhost:${port}`));
    })
    .catch((err) => {
        console.error("Could not set up the database. Is Docker running?", err);
        process.exit(1);
    });
