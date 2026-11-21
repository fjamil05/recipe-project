# Recipe Tracker

A web application for saving recipes, organizing them into boards, planning meals for the week, and sharing recipes with other people.

Final project for CS 332, Fall 2026, built by AvaMarie Griffiths, Farrah Jamil, and Asmitha Muthukumar.
## Features

- **Accounts:** sign up and log in. Passwords are hashed with bcrypt, and failed logins are rate limited. You can change your password or delete your account under **Account Settings**.
- **Recipes and boards:** create recipes and group them into boards. Everything is saved to your account, so it shows up on any computer you log in from.
- **Weekly planner:** schedule recipes on days of the week and check them off when they're done.
- **Grocery list:** a checklist built automatically from the ingredients of the week's planned recipes. You can copy it to your clipboard.
- **Sharing:**
  - Set a board to **Shared** and its recipes show up on everyone's Search page.
  - **Copy Share Link** on any recipe or board gives a link anyone can view without logging in.
- **Collaborators:** invite another user to one of your boards so they can add their own recipes to it.
- **Reviews:** rate other people's shared recipes from 1 to 5 stars and leave a comment.
- **Search:** filter by name, category, difficulty, cooking time, or ingredients (for example `chicken, rice`).

## Tech stack

| Part | What we used |
|---|---|
| Frontend | HTML, CSS, TypeScript (compiled to `public/js`) |
| Backend | Node.js, Express 5, TypeScript (run with `tsx`) |
| Database | MariaDB locally (Docker); any MySQL-compatible database when hosted |
| Auth | `express-session` with sessions stored in the database, `bcrypt` |

## Running it locally

**You need:** Node.js 22 or newer, and Docker Desktop.

1. Install the packages:
   ```bash
   npm install
   ```
2. Copy `.env.example` to a new file named `.env`. Change `SESSION_SECRET` to any long random text.
3. Open Docker Desktop, then start the database:
   ```bash
   docker compose up -d
   ```
4. Start the site:
   ```bash
   npm run dev
   ```
   This compiles the frontend and starts the server. The database tables are created automatically on startup.
5. Open http://localhost:3000.

To stop the server, press `Ctrl+C`. Always stop it before running `npm run dev` again, so old copies don't keep running in the background.

## Project structure

```
public/            Pages, CSS and compiled frontend JavaScript (served as-is)
  js/              Built from src/frontend by `npm run build`; don't edit these directly
sql/schema.sql     Database tables (run automatically when the server starts)
src/
  server.ts        Express server and all /api routes
  database.ts      Database connection pool
  sessionStore.ts  Keeps login sessions in the database
  models/          User class
  repositories/    Database queries (users, recipes/boards, reviews/collaborators)
  frontend/        Browser code (TypeScript)
```

## Hosting it for free

We host the website on **Render** and the database on **TiDB Cloud Starter**. TiDB is MySQL-compatible, so the code works unchanged. Both have free tiers that don't need a credit card.

### 1. Create the database (TiDB Cloud)

1. Sign up at https://tidbcloud.com and create a **Starter** instance.
2. Click **Connect**, choose **General** / **Node.js**, then generate a password. Write down the host, port (4000), user and password.
3. You can use the default database, `test`.

### 2. Create the web service (Render)

1. Sign up at https://render.com with GitHub, then click **New → Web Service** and pick this repository.
2. Use these settings:
   - **Build command:** `npm install --include=dev && npm run build`
   - **Start command:** `npm start`
   - **Instance type:** Free
3. Under **Environment**, add these variables:

   | Key | Value |
   |---|---|
   | `DB_HOST` | host from TiDB |
   | `DB_PORT` | `4000` |
   | `DB_USER` | user from TiDB |
   | `DB_PASSWORD` | password from TiDB |
   | `DB_NAME` | `test` |
   | `DB_SSL` | `true` |
   | `SESSION_SECRET` | any long random text |

4. Click **Deploy**. When it finishes, the site is live at `https://<your-service>.onrender.com`. Pushing to `main` redeploys automatically.

**Free tier notes:** Render puts the site to sleep after 15 minutes without visitors, so the first page load after that takes up to a minute. Logins are stored in the database, so users stay logged in through those restarts.

## Security notes

- Passwords are hashed with bcrypt and never stored or sent back in plain text.
- All database queries use parameterized placeholders, which prevents SQL injection.
- The login session ID is regenerated on login, which prevents session fixation. Cookies are `httpOnly`, `sameSite=lax`, and `secure` over HTTPS.
- After 5 failed logins for the same email from the same address, login is locked for 15 minutes.
- Page content is inserted with `textContent`, never `innerHTML`, which prevents cross-site scripting (XSS).
- The server checks that you own a recipe or board, or collaborate on it, before changing it.
