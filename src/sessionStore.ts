
import session from "express-session";
import pool from "./database.js";

// Keeps login sessions in the database instead of server memory,
// so people stay logged in when the server restarts or the host puts it to sleep.
export class DatabaseSessionStore extends session.Store {

    constructor() {
        super();

        // Clear out expired sessions once an hour
        setInterval(() => {
            pool.query("DELETE FROM Sessions WHERE expires < ?", [Date.now()]).catch(console.error);
        }, 60 * 60 * 1000).unref();
    }

    private expiresAt(data: session.SessionData): number {
        const expires = data.cookie?.expires;
        return expires ? new Date(expires).getTime() : Date.now() + 24 * 60 * 60 * 1000;
    }

    override get(sid: string, callback: (err: unknown, session?: session.SessionData | null) => void): void {
        pool.query("SELECT data FROM Sessions WHERE session_id = ? AND expires > ?", [sid, Date.now()])
            .then((rows) => callback(null, rows[0] ? JSON.parse(rows[0].data) : null))
            .catch((err) => callback(err));
    }

    override set(sid: string, data: session.SessionData, callback?: (err?: unknown) => void): void {
        pool.query(
            `INSERT INTO Sessions (session_id, data, expires) VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE data = VALUES(data), expires = VALUES(expires)`,
            [sid, JSON.stringify(data), this.expiresAt(data)]
        )
            .then(() => callback?.())
            .catch((err) => callback?.(err));
    }

    override destroy(sid: string, callback?: (err?: unknown) => void): void {
        pool.query("DELETE FROM Sessions WHERE session_id = ?", [sid])
            .then(() => callback?.())
            .catch((err) => callback?.(err));
    }

    override touch(sid: string, data: session.SessionData, callback?: () => void): void {
        pool.query("UPDATE Sessions SET expires = ? WHERE session_id = ?", [this.expiresAt(data), sid])
            .then(() => callback?.())
            .catch(() => callback?.());
    }
}
