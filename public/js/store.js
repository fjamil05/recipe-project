// =========================================
// Account storage
// =========================================
// Keeps everything a user saves in the database, tied to their account.
// It works like localStorage (getItem / setItem) so the page code barely changes:
//   - "savedRecipes" and "recipeBoards" are saved together to /api/library
//   - planner, display name, profile picture and grocery checkmarks
//     are saved one at a time to /api/userdata/<key>
// Anything else still uses localStorage.
import { notify } from "./ui.js";
const LIBRARY_KEYS = ["savedRecipes", "recipeBoards"];
const USER_DATA_KEYS = ["plannedRecipes", "profileDisplayName", "profilePicture", "groceryChecks"];
const library = {
    savedRecipes: "[]",
    recipeBoards: "[]"
};
const userData = {};
// The logged-in user's username (used as the default display name)
export let currentUsername = "";
let loaded = false;
let libraryTimer;
const userDataTimers = new Map();
let saving = Promise.resolve();
let warnedAboutSaving = false;
// Recipes other users put in Shared boards (filled in by the Search page)
export const communityRecipes = [];
function libraryBody() {
    return JSON.stringify({
        savedRecipes: JSON.parse(library.savedRecipes ?? "[]"),
        recipeBoards: JSON.parse(library.recipeBoards ?? "[]")
    });
}
async function send(path, body) {
    const response = await fetch(path, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body
    });
    if (response.status === 401) {
        window.location.href = "login.html";
        return;
    }
    if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        if (!warnedAboutSaving) {
            warnedAboutSaving = true;
            notify(data.error ?? "Your changes couldn't be saved. Check that the server is running.", "error");
            window.setTimeout(() => (warnedAboutSaving = false), 10000);
        }
    }
}
function queue(task) {
    saving = saving.then(task).catch(() => {
        notify("Your changes couldn't be saved. Check your connection.", "error");
    });
}
function scheduleLibrarySave() {
    if (!loaded) {
        // Never overwrite the account with empty data if loading failed
        return;
    }
    window.clearTimeout(libraryTimer);
    libraryTimer = window.setTimeout(() => {
        libraryTimer = undefined;
        queue(() => send("/api/library", libraryBody()));
    }, 300);
}
function scheduleUserDataSave(key) {
    if (!loaded) {
        return;
    }
    window.clearTimeout(userDataTimers.get(key));
    userDataTimers.set(key, window.setTimeout(() => {
        userDataTimers.delete(key);
        queue(() => send(`/api/userdata/${key}`, JSON.stringify({ value: userData[key] ?? null })));
    }, 300));
}
// Waits until every change has reached the server
export async function flush() {
    if (libraryTimer !== undefined) {
        window.clearTimeout(libraryTimer);
        libraryTimer = undefined;
        queue(() => send("/api/library", libraryBody()));
    }
    for (const [key, timer] of userDataTimers) {
        window.clearTimeout(timer);
        userDataTimers.delete(key);
        queue(() => send(`/api/userdata/${key}`, JSON.stringify({ value: userData[key] ?? null })));
    }
    await saving;
}
export const store = {
    getItem(key) {
        if (LIBRARY_KEYS.includes(key)) {
            return library[key] ?? null;
        }
        if (USER_DATA_KEYS.includes(key)) {
            return userData[key] ?? null;
        }
        return localStorage.getItem(key);
    },
    setItem(key, value) {
        if (LIBRARY_KEYS.includes(key)) {
            library[key] = value;
            scheduleLibrarySave();
        }
        else if (USER_DATA_KEYS.includes(key)) {
            userData[key] = value;
            scheduleUserDataSave(key);
        }
        else {
            localStorage.setItem(key, value);
        }
    },
    removeItem(key) {
        if (LIBRARY_KEYS.includes(key)) {
            library[key] = "[]";
            scheduleLibrarySave();
        }
        else if (USER_DATA_KEYS.includes(key)) {
            userData[key] = null;
            scheduleUserDataSave(key);
        }
        else {
            localStorage.removeItem(key);
        }
    }
};
// One time only: move things that were saved in this browser
// before accounts existed into the account
function moveBrowserDataIntoAccount(data) {
    const accountHasLibrary = (data.savedRecipes ?? []).length > 0 || (data.recipeBoards ?? []).length > 0;
    if (!accountHasLibrary && !localStorage.getItem("movedToAccount")) {
        const oldRecipes = localStorage.getItem("savedRecipes");
        const oldBoards = localStorage.getItem("recipeBoards");
        if (oldRecipes || oldBoards) {
            library.savedRecipes = oldRecipes ?? "[]";
            library.recipeBoards = oldBoards ?? "[]";
            scheduleLibrarySave();
            localStorage.setItem("movedToAccount", "true");
        }
    }
    if (!localStorage.getItem("movedSettingsToAccount")) {
        let moved = false;
        for (const key of ["plannedRecipes", "profileDisplayName", "profilePicture"]) {
            const oldValue = localStorage.getItem(key);
            if (oldValue && !userData[key]) {
                userData[key] = oldValue;
                scheduleUserDataSave(key);
                moved = true;
            }
        }
        if (moved) {
            localStorage.setItem("movedSettingsToAccount", "true");
        }
    }
}
// Load the account's data before the page code runs
async function load() {
    const response = await fetch("/api/library");
    if (response.status === 401) {
        window.location.href = "login.html";
        // Stop here so the page doesn't run without an account
        await new Promise(() => { });
    }
    if (!response.ok) {
        throw new Error(`Loading failed (${response.status})`);
    }
    const data = await response.json();
    library.savedRecipes = JSON.stringify(data.savedRecipes ?? []);
    library.recipeBoards = JSON.stringify(data.recipeBoards ?? []);
    Object.assign(userData, data.userData ?? {});
    currentUsername = data.username ?? "";
    loaded = true;
    moveBrowserDataIntoAccount(data);
    await flush();
}
try {
    await load();
}
catch (error) {
    console.error(error);
    notify("Couldn't load your recipes. Make sure the server is running, then refresh the page.", "error");
}
// Send any last change if the page is closed right after editing
window.addEventListener("pagehide", () => {
    if (!loaded) {
        return;
    }
    if (libraryTimer !== undefined) {
        fetch("/api/library", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: libraryBody(),
            keepalive: true
        });
    }
    for (const key of userDataTimers.keys()) {
        fetch(`/api/userdata/${key}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ value: userData[key] ?? null }),
            keepalive: true
        });
    }
});
// =========================================
// Share links
// =========================================
// Creates a share link for a recipe (by name) or board (by id) and copies it
export async function copyShareLink(type, key) {
    await flush();
    const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, key })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) {
        notify(data.error ?? "Couldn't create a share link.", "error");
        return;
    }
    try {
        await navigator.clipboard.writeText(data.url);
        notify("Share link copied! Anyone with the link can view it.", "success");
    }
    catch {
        prompt("Copy this share link:", data.url);
    }
}
// A "Copy Share Link" button for the three-dot menus
export function createShareButton(type, key) {
    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.textContent = "Copy Share Link";
    shareButton.addEventListener("click", () => {
        copyShareLink(type, key);
    });
    return shareButton;
}
