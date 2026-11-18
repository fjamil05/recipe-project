import { store, communityRecipes } from "./store.js";
let selectedRecipe = null;
export const recipes = [];
function displayRecipe(recipe) {
    selectedRecipe = recipe;
    const name = document.querySelector("#detail-name");
    const category = document.querySelector("#detail-category");
    const time = document.querySelector("#detail-time");
    const difficulty = document.querySelector("#detail-difficulty");
    const rating = document.querySelector("#detail-rating");
    const ingredients = document.querySelector("#detail-ingredients");
    const instructions = document.querySelector("#detail-instructions");
    if (!name || !category || !time || !difficulty ||
        !rating || !ingredients || !instructions) {
        return;
    }
    name.textContent = recipe.name;
    category.textContent = recipe.category;
    time.textContent = `${recipe.time} minutes`;
    difficulty.textContent = recipe.difficulty;
    rating.textContent = recipe.rating;
    ingredients.replaceChildren();
    instructions.replaceChildren();
    recipe.ingredients.forEach((ingredient) => {
        const item = document.createElement("li");
        item.textContent = ingredient;
        ingredients.appendChild(item);
    });
    recipe.instructions.forEach((instruction) => {
        const item = document.createElement("li");
        item.textContent = instruction;
        instructions.appendChild(item);
    });
    document.querySelector("#recipe-details")?.scrollIntoView({
        behavior: "smooth"
    });
}
document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
        return;
    }
    const viewButton = target.closest(".view-recipe-button");
    if (!viewButton) {
        return;
    }
    const recipeCard = viewButton.closest(".recipe-card");
    const recipeName = recipeCard?.querySelector("h3")?.textContent?.trim();
    if (!recipeName) {
        return;
    }
    const savedRecipes = JSON.parse(store.getItem("savedRecipes") ?? "[]");
    // Recipes shared by other users are marked with data-owner
    const owner = recipeCard?.getAttribute("data-owner");
    const matchedRecipe = owner
        ? communityRecipes.find((recipe) => recipe.name === recipeName && recipe.owner === owner)
        : savedRecipes.find((recipe) => recipe.name === recipeName);
    if (!matchedRecipe) {
        alert("Recipe details could not be found.");
        return;
    }
    displayRecipe(matchedRecipe);
});
const saveToBoardButton = document.querySelector(".save-recipe-button");
const saveToBoardPanel = document.querySelector("#save-to-board-panel");
const saveBoardSelect = document.querySelector("#save-board-select");
const saveBoardSelection = document.querySelector("#save-board-selection");
const cancelSaveBoardButton = document.querySelector("#cancel-save-board");
const confirmSaveBoardButton = document.querySelector("#confirm-save-board");
const saveBoardMessage = document.querySelector("#save-board-message");
const destinationOptions = document.querySelectorAll('input[name="save-destination"]');
destinationOptions.forEach((option) => {
    option.addEventListener("change", () => {
        if (option.checked && saveBoardSelection) {
            saveBoardSelection.hidden = option.value !== "board";
        }
    });
});
// Open the Save Recipe panel
saveToBoardButton?.addEventListener("click", () => {
    if (!selectedRecipe || !saveToBoardPanel || !saveBoardSelect) {
        alert("Please select a recipe first.");
        return;
    }
    const boards = JSON.parse(store.getItem("recipeBoards") ?? "[]");
    saveBoardSelect.replaceChildren();
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a board";
    saveBoardSelect.appendChild(defaultOption);
    boards.forEach((board) => {
        const option = document.createElement("option");
        option.value = String(board.id);
        option.textContent = board.name;
        saveBoardSelect.appendChild(option);
    });
    const unsortedOption = document.querySelector('input[name="save-destination"][value="unsorted"]');
    if (unsortedOption) {
        unsortedOption.checked = true;
    }
    if (saveBoardSelection) {
        saveBoardSelection.hidden = false;
    }
    if (saveBoardMessage) {
        saveBoardMessage.textContent = "";
    }
    saveToBoardPanel.hidden = false;
});
// Cancel saving
cancelSaveBoardButton?.addEventListener("click", () => {
    if (saveToBoardPanel) {
        saveToBoardPanel.hidden = true;
    }
});
// If the selected recipe was shared by another user, save a copy of it
// into this account first. Returns the name the recipe is saved under.
function saveSelectedRecipeToAccount(recipe) {
    if (!("owner" in recipe)) {
        return recipe.name;
    }
    const owner = String(recipe.owner);
    const savedRecipes = JSON.parse(store.getItem("savedRecipes") ?? "[]");
    const findSaved = (name) => savedRecipes.find((saved) => saved.name.toLowerCase() === name.toLowerCase());
    const sameContent = (saved) => JSON.stringify([saved.ingredients, saved.instructions]) ===
        JSON.stringify([recipe.ingredients, recipe.instructions]);
    // Already saved earlier
    const existing = findSaved(recipe.name);
    if (existing && sameContent(existing)) {
        return existing.name;
    }
    // You already have a different recipe with this name
    const name = existing ? `${recipe.name} (from ${owner})` : recipe.name;
    if (findSaved(name)) {
        return name;
    }
    savedRecipes.push({
        name,
        category: recipe.category,
        time: recipe.time,
        difficulty: recipe.difficulty,
        rating: recipe.rating,
        ingredients: [...recipe.ingredients],
        instructions: [...recipe.instructions]
    });
    store.setItem("savedRecipes", JSON.stringify(savedRecipes));
    return name;
}
// Save the selected recipe
confirmSaveBoardButton?.addEventListener("click", () => {
    if (!selectedRecipe || !saveBoardSelect) {
        return;
    }
    const recipeName = saveSelectedRecipeToAccount(selectedRecipe);
    const destination = document.querySelector('input[name="save-destination"]:checked')?.value;
    const boards = JSON.parse(store.getItem("recipeBoards") ?? "[]");
    if (destination === "unsorted") {
        boards.forEach((board) => {
            board.recipes = board.recipes.filter((name) => name !== recipeName);
        });
        store.setItem("recipeBoards", JSON.stringify(boards));
        if (saveBoardMessage) {
            saveBoardMessage.textContent =
                `${recipeName} was moved to Unsorted Recipes!`;
        }
        return;
    }
    if (destination === "board") {
        if (!saveBoardSelect.value) {
            alert("Please select a board.");
            return;
        }
        const selectedBoard = boards.find((board) => board.id === Number(saveBoardSelect.value));
        if (!selectedBoard) {
            alert("The selected board could not be found.");
            return;
        }
        if (selectedBoard.recipes.includes(recipeName)) {
            if (saveBoardMessage) {
                saveBoardMessage.textContent =
                    "This recipe is already in that board.";
            }
            return;
        }
        selectedBoard.recipes.push(recipeName);
        store.setItem("recipeBoards", JSON.stringify(boards));
        if (saveBoardMessage) {
            saveBoardMessage.textContent =
                `${recipeName} was added to ${selectedBoard.name}!`;
        }
    }
});
