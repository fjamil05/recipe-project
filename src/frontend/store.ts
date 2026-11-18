
// =========================================
// Account storage
// =========================================
// Keeps the logged-in user's saved recipes and boards in the database.
// It works like localStorage (getItem / setItem) so the page code barely changes:
// "savedRecipes" and "recipeBoards" go to the server, anything else
// (meal planner, profile name, ...) still uses localStorage for now.

const SERVER_KEYS = ["savedRecipes", "recipeBoards"];

const cache: Record<string, string> = {
    savedRecipes: "[]",
    recipeBoards: "[]"
};

let loaded = false;
let saveTimer: number | undefined;
let saving: Promise<void> = Promise.resolve();

export interface CommunityRecipe {
    name: string;
    category: string;
    time: number;
    difficulty: string;
    rating: string;
    ingredients: string[];
    instructions: string[];
    owner: string;
    boardName: string;
}

// Recipes other users put in Shared boards (filled in by the Search page)
export const communityRecipes: CommunityRecipe[] = [];

function libraryBody(): string {
    return JSON.stringify({
        savedRecipes: JSON.parse(cache.savedRecipes ?? "[]"),
        recipeBoards: JSON.parse(cache.recipeBoards ?? "[]")
    });
}

async function sendToServer(): Promise<void> {
    const response = await fetch("/api/library", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: libraryBody()
    });

    if (response.status === 401) {
        window.location.href = "login.html";
        return;
    }

    if (!response.ok) {
        alert("Your changes couldn't be saved. Check that the server is running and try again.");
    }
}

function scheduleSave(): void {
    if (!loaded) {
        // Never overwrite the account with an empty list if loading failed
        return;
    }

    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
        saveTimer = undefined;
        saving = saving.then(sendToServer).catch(console.error);
    }, 300);
}

// Waits until every change has reached the server
export async function flush(): Promise<void> {
    if (saveTimer !== undefined) {
        window.clearTimeout(saveTimer);
        saveTimer = undefined;
        saving = saving.then(sendToServer).catch(console.error);
    }
    await saving;
}

export const store = {
    getItem(key: string): string | null {
        return SERVER_KEYS.includes(key) ? cache[key] ?? null : localStorage.getItem(key);
    },

    setItem(key: string, value: string): void {
        if (SERVER_KEYS.includes(key)) {
            cache[key] = value;
            scheduleSave();
        } else {
            localStorage.setItem(key, value);
        }
    },

    removeItem(key: string): void {
        if (SERVER_KEYS.includes(key)) {
            cache[key] = "[]";
            scheduleSave();
        } else {
            localStorage.removeItem(key);
        }
    }
};

// Load the account's recipes and boards before the page code runs
async function load(): Promise<void> {
    const response = await fetch("/api/library");

    if (response.status === 401) {
        window.location.href = "login.html";
        // Stop here so the page doesn't run without an account
        await new Promise(() => {});
    }

    if (!response.ok) {
        throw new Error(`Loading failed (${response.status})`);
    }

    const data = await response.json();
    cache.savedRecipes = JSON.stringify(data.savedRecipes ?? []);
    cache.recipeBoards = JSON.stringify(data.recipeBoards ?? []);
    loaded = true;

    // One time only: move recipes that were saved in this browser
    // before accounts existed into the account
    const oldRecipes = localStorage.getItem("savedRecipes");
    const oldBoards = localStorage.getItem("recipeBoards");
    const accountIsEmpty =
        (data.savedRecipes ?? []).length === 0 && (data.recipeBoards ?? []).length === 0;

    if (accountIsEmpty && (oldRecipes || oldBoards) && !localStorage.getItem("movedToAccount")) {
        cache.savedRecipes = oldRecipes ?? "[]";
        cache.recipeBoards = oldBoards ?? "[]";
        scheduleSave();
        await flush();
        localStorage.setItem("movedToAccount", "true");
    }
}

try {
    await load();
} catch (error) {
    console.error(error);
    alert("Couldn't load your recipes. Make sure the server is running, then refresh the page.");
}

// Send any last change if the page is closed right after editing
window.addEventListener("pagehide", () => {
    if (saveTimer !== undefined && loaded) {
        window.clearTimeout(saveTimer);
        fetch("/api/library", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: libraryBody(),
            keepalive: true
        });
    }
});


// =========================================
// Share links
// =========================================

// Creates a share link for a recipe (by name) or board (by id) and copies it
export async function copyShareLink(type: "recipe" | "board", key: string): Promise<void> {
    await flush();

    const response = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, key })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || !data.url) {
        alert(data.error ?? "Couldn't create a share link.");
        return;
    }

    try {
        await navigator.clipboard.writeText(data.url);
        alert(`Share link copied! Anyone with this link can view it:\n\n${data.url}`);
    } catch {
        prompt("Copy this share link:", data.url);
    }
}

// A "Copy Share Link" button for the three-dot menus
export function createShareButton(type: "recipe" | "board", key: string): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "Copy Share Link";
    button.addEventListener("click", () => {
        copyShareLink(type, key);
    });
    return button;
}
