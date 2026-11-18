
// =========================================
// Grocery list (Dashboard)
// =========================================
// Adds up the ingredients of every recipe planned for the week shown
// on the dashboard. Checkmarks are saved to the account per week.

import { store } from "./store.js";
import { notify } from "./ui.js";

interface PlannedRecipe {
    id: number;
    recipeName: string;
    date: string;
    completed: boolean;
}

interface SavedRecipe {
    name: string;
    ingredients: string[];
}

interface GroceryItem {
    key: string;
    text: string;
    recipes: string[];
}

let shownWeekKey = "";
let shownItems: GroceryItem[] = [];

function dateKey(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

function loadChecks(): Record<string, string[]> {
    try {
        return JSON.parse(store.getItem("groceryChecks") ?? "{}");
    } catch {
        return {};
    }
}

function saveChecks(weekKey: string, checked: string[]): void {
    const checks = loadChecks();
    checks[weekKey] = checked;

    // Only keep the most recent 8 weeks of checkmarks
    const recentWeeks = Object.keys(checks).sort().slice(-8);
    const trimmed: Record<string, string[]> = {};
    recentWeeks.forEach((week) => (trimmed[week] = checks[week] ?? []));

    store.setItem("groceryChecks", JSON.stringify(trimmed));
}

function buildItems(monday: Date): GroceryItem[] {
    const planned: PlannedRecipe[] = JSON.parse(store.getItem("plannedRecipes") ?? "[]");
    const saved: SavedRecipe[] = JSON.parse(store.getItem("savedRecipes") ?? "[]");

    const weekDates = new Set<string>();
    for (let i = 0; i < 7; i++) {
        const date = new Date(monday);
        date.setDate(date.getDate() + i);
        weekDates.add(dateKey(date));
    }

    const items = new Map<string, GroceryItem>();

    planned
        .filter((plan) => weekDates.has(plan.date))
        .forEach((plan) => {
            const recipe = saved.find((r) => r.name === plan.recipeName);
            recipe?.ingredients.forEach((ingredient) => {
                const text = ingredient.trim();
                if (!text) {
                    return;
                }

                const key = text.toLowerCase();
                const item = items.get(key) ?? { key, text, recipes: [] };
                item.recipes.push(plan.recipeName);
                items.set(key, item);
            });
        });

    return [...items.values()].sort((a, b) => a.text.localeCompare(b.text));
}

export function renderGroceryList(monday: Date): void {
    const list = document.querySelector<HTMLUListElement>("#grocery-list");
    const emptyMessage = document.querySelector<HTMLElement>("#grocery-empty");
    const copyButton = document.querySelector<HTMLButtonElement>("#copy-grocery-list");

    if (!list || !emptyMessage) {
        return;
    }

    shownWeekKey = dateKey(monday);
    shownItems = buildItems(monday);
    const checked = new Set(loadChecks()[shownWeekKey] ?? []);

    list.replaceChildren();
    emptyMessage.hidden = shownItems.length > 0;
    if (copyButton) {
        copyButton.hidden = shownItems.length === 0;
    }

    shownItems.forEach((item) => {
        const row = document.createElement("li");
        row.className = "grocery-item";

        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = checked.has(item.key);

        const text = document.createElement("span");
        text.className = "grocery-item-text";
        text.textContent = item.text;

        const usedIn = document.createElement("span");
        usedIn.className = "grocery-item-recipes";
        const uniqueRecipes = [...new Set(item.recipes)];
        usedIn.textContent = item.recipes.length > 1
            ? ` ×${item.recipes.length} (${uniqueRecipes.join(", ")})`
            : ` (${uniqueRecipes[0]})`;

        row.classList.toggle("checked", checkbox.checked);

        checkbox.addEventListener("change", () => {
            row.classList.toggle("checked", checkbox.checked);

            const nowChecked = new Set(loadChecks()[shownWeekKey] ?? []);
            if (checkbox.checked) {
                nowChecked.add(item.key);
            } else {
                nowChecked.delete(item.key);
            }
            saveChecks(shownWeekKey, [...nowChecked]);
        });

        label.append(checkbox, text, usedIn);
        row.appendChild(label);
        list.appendChild(row);
    });
}

// Copy everything that isn't checked off yet
document.querySelector<HTMLButtonElement>("#copy-grocery-list")?.addEventListener("click", async () => {
    const checked = new Set(loadChecks()[shownWeekKey] ?? []);
    const remaining = shownItems.filter((item) => !checked.has(item.key));

    if (remaining.length === 0) {
        notify("Everything on the list is checked off!", "success");
        return;
    }

    const text = remaining
        .map((item) => `- ${item.text}${item.recipes.length > 1 ? ` (×${item.recipes.length})` : ""}`)
        .join("\n");

    try {
        await navigator.clipboard.writeText(text);
        notify("Grocery list copied!", "success");
    } catch {
        prompt("Copy your grocery list:", text);
    }
});
