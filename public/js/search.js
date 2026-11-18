import { store, communityRecipes } from "./store.js";
function filterRecipes() {
    const searchInput = document.querySelector("#recipe-search");
    const categoryFilter = document.querySelector("#category-filter");
    const difficultyFilter = document.querySelector("#difficulty-filter");
    const timeFilter = document.querySelector("#time-filter");
    const recipeCards = document.querySelectorAll(".recipe-card");
    if (!searchInput || !categoryFilter || !difficultyFilter || !timeFilter) {
        return;
    }
    const searchText = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedDifficulty = difficultyFilter.value;
    const selectedTime = Number(timeFilter.value);
    let visibleRecipes = 0;
    recipeCards.forEach((card) => {
        const recipeName = card.querySelector("h3")?.textContent ?? "";
        const recipeInfo = card.querySelector(".recipe-info");
        const paragraphs = recipeInfo?.querySelectorAll("p");
        if (!paragraphs || paragraphs.length < 3) {
            return;
        }
        const categoryText = paragraphs.item(0)?.textContent ?? "";
        const timeText = paragraphs.item(1)?.textContent ?? "";
        const difficultyText = paragraphs.item(2)?.textContent ?? "";
        const category = categoryText.trim();
        const time = Number(timeText.match(/\d+/)?.[0] ?? 0);
        const difficulty = difficultyText
            .replace("Difficulty:", "")
            .trim();
        // Match the recipe name or its ingredients. Separate several
        // ingredients with commas, e.g. "chicken, rice" finds recipes with both.
        const searchable = `${recipeName}\n${card.dataset.ingredients ?? ""}`.toLowerCase();
        const matchesSearch = searchText
            .split(",")
            .map((term) => term.trim())
            .filter((term) => term.length > 0)
            .every((term) => searchable.includes(term));
        const matchesCategory = selectedCategory === "" || category === selectedCategory;
        const matchesDifficulty = selectedDifficulty === "" || difficulty === selectedDifficulty;
        const matchesTime = selectedTime === 0 || time < selectedTime;
        const isVisible = matchesSearch &&
            matchesCategory &&
            matchesDifficulty &&
            matchesTime;
        card.style.display = isVisible ? "" : "none";
        if (isVisible) {
            visibleRecipes++;
        }
    });
    const noResultsMessage = document.querySelector("#no-search-results");
    if (noResultsMessage) {
        noResultsMessage.hidden = visibleRecipes > 0;
    }
}
const searchInput = document.querySelector("#recipe-search");
const categoryFilter = document.querySelector("#category-filter");
const difficultyFilter = document.querySelector("#difficulty-filter");
const timeFilter = document.querySelector("#time-filter");
searchInput?.addEventListener("input", filterRecipes);
categoryFilter?.addEventListener("change", filterRecipes);
difficultyFilter?.addEventListener("change", filterRecipes);
timeFilter?.addEventListener("change", filterRecipes);
function loadSavedRecipes() {
    const recipeGrid = document.querySelector(".recipe-grid");
    if (!recipeGrid) {
        return;
    }
    const savedRecipes = JSON.parse(store.getItem("savedRecipes") ?? "[]");
    // Remove existing recipe cards
    recipeGrid.querySelectorAll(".recipe-card").forEach((card) => {
        card.remove();
    });
    savedRecipes.forEach((recipe) => {
        const card = document.createElement("article");
        card.className = "recipe-card";
        card.dataset.ingredients = recipe.ingredients.join("\n");
        const recipeInfo = document.createElement("div");
        recipeInfo.className = "recipe-info";
        const name = document.createElement("h3");
        name.textContent = recipe.name;
        const category = document.createElement("p");
        category.textContent = recipe.category;
        const time = document.createElement("p");
        time.textContent = `Time: ${recipe.time} minutes`;
        const difficulty = document.createElement("p");
        difficulty.textContent = `Difficulty: ${recipe.difficulty}`;
        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.className = "view-recipe-button";
        viewButton.textContent = "View Recipe";
        recipeInfo.append(name, category, time, difficulty, viewButton);
        card.appendChild(recipeInfo);
        recipeGrid.appendChild(card);
    });
    filterRecipes();
}
loadSavedRecipes();
// =========================================
// Recipes shared by other users
// =========================================
// Shows recipes from everyone else's "Shared" boards after your own recipes.
async function loadCommunityRecipes() {
    const recipeGrid = document.querySelector(".recipe-grid");
    if (!recipeGrid) {
        return;
    }
    const response = await fetch("/api/community-recipes");
    if (!response.ok) {
        return;
    }
    const sharedRecipes = await response.json();
    communityRecipes.splice(0, communityRecipes.length, ...sharedRecipes);
    sharedRecipes.forEach((recipe) => {
        const card = document.createElement("article");
        card.className = "recipe-card community-recipe";
        card.dataset.owner = recipe.owner;
        card.dataset.ingredients = recipe.ingredients.join("\n");
        const recipeInfo = document.createElement("div");
        recipeInfo.className = "recipe-info";
        const name = document.createElement("h3");
        name.textContent = recipe.name;
        const category = document.createElement("p");
        category.textContent = recipe.category;
        const time = document.createElement("p");
        time.textContent = `Time: ${recipe.time} minutes`;
        const difficulty = document.createElement("p");
        difficulty.textContent = `Difficulty: ${recipe.difficulty}`;
        const sharedBy = document.createElement("p");
        sharedBy.className = "shared-by";
        sharedBy.textContent = recipe.reviewCount > 0 && recipe.averageStars !== null
            ? `Shared by ${recipe.owner} · ${Math.round(recipe.averageStars * 10) / 10}/5 (${recipe.reviewCount})`
            : `Shared by ${recipe.owner}`;
        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.className = "view-recipe-button";
        viewButton.textContent = "View Recipe";
        recipeInfo.append(name, category, time, difficulty, sharedBy, viewButton);
        card.appendChild(recipeInfo);
        recipeGrid.appendChild(card);
    });
    filterRecipes();
}
loadCommunityRecipes();
