import { store, communityRecipes } from "./store.js";
import { notify } from "./ui.js";
import { renderReviews } from "./reviews.js";

export interface RecipeDetails {
    name: string;
    category: string;
    time: number;
    difficulty: string;
    rating: string;
    ingredients: string[];
    instructions: string[];
}

let selectedRecipe: RecipeDetails | null = null;

export const recipes: RecipeDetails[] = [];

function displayRecipe(recipe: RecipeDetails): void {
    selectedRecipe = recipe;
    const name = document.querySelector<HTMLElement>("#detail-name");
    const category = document.querySelector<HTMLElement>("#detail-category");
    const time = document.querySelector<HTMLElement>("#detail-time");
    const difficulty = document.querySelector<HTMLElement>("#detail-difficulty");
    const rating = document.querySelector<HTMLElement>("#detail-rating");

    const ingredients =
        document.querySelector<HTMLUListElement>("#detail-ingredients");

    const instructions =
        document.querySelector<HTMLOListElement>("#detail-instructions");

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

    // Reviews: what others said about your recipe, or leave one on theirs
    let reviewsBox = document.querySelector<HTMLElement>("#recipe-reviews");
    if (!reviewsBox) {
        reviewsBox = document.createElement("section");
        reviewsBox.id = "recipe-reviews";
        reviewsBox.className = "recipe-reviews";
        instructions.after(reviewsBox);
    }
    renderReviews(reviewsBox, recipe as RecipeDetails & { id?: number; owner?: string });

    document.querySelector("#recipe-details")?.scrollIntoView({
        behavior: "smooth"
    });
}


document.addEventListener("click", (event: MouseEvent) => {
    const target = event.target;

    if (!(target instanceof Element)) {
        return;
    }

    const viewButton = target.closest(".view-recipe-button");

    if (!viewButton) {
        return;
    }

    const recipeCard = viewButton.closest(".recipe-card");

    const recipeName =
        recipeCard?.querySelector("h3")?.textContent?.trim();

    if (!recipeName) {
        return;
    }

    const savedRecipes: RecipeDetails[] = JSON.parse(
        store.getItem("savedRecipes") ?? "[]"
    );

    // Recipes shared by other users are marked with data-owner
    const owner = recipeCard?.getAttribute("data-owner");

    const matchedRecipe = owner
        ? communityRecipes.find(
            (recipe) => recipe.name === recipeName && recipe.owner === owner
        )
        : savedRecipes.find(
            (recipe) => recipe.name === recipeName
        );

    if (!matchedRecipe) {
        notify("Recipe details could not be found.");
        return;
    }

    displayRecipe(matchedRecipe);
});



interface RecipeBoard {
    id: number;
    name: string;
    visibility: string;
    recipes: string[];
    coverPhoto?: string | undefined;
}


const saveToBoardButton =
    document.querySelector<HTMLButtonElement>(".save-recipe-button");

const saveToBoardPanel =
    document.querySelector<HTMLElement>("#save-to-board-panel");

const saveBoardSelect =
    document.querySelector<HTMLSelectElement>("#save-board-select");

const saveBoardSelection =
    document.querySelector<HTMLElement>("#save-board-selection");

const cancelSaveBoardButton =
    document.querySelector<HTMLButtonElement>("#cancel-save-board");

const confirmSaveBoardButton =
    document.querySelector<HTMLButtonElement>("#confirm-save-board");

const saveBoardMessage =
    document.querySelector<HTMLElement>("#save-board-message");


const destinationOptions =
    document.querySelectorAll<HTMLInputElement>(
        'input[name="save-destination"]'
    );

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
        notify("Please select a recipe first.");
        return;
    }

    const boards: RecipeBoard[] = JSON.parse(
        store.getItem("recipeBoards") ?? "[]"
    );

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

    const unsortedOption = document.querySelector<HTMLInputElement>(
        'input[name="save-destination"][value="unsorted"]'
    );

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
function saveSelectedRecipeToAccount(recipe: RecipeDetails): string {
    if (!("owner" in recipe)) {
        return recipe.name;
    }

    const owner = String(recipe.owner);
    const savedRecipes: RecipeDetails[] = JSON.parse(
        store.getItem("savedRecipes") ?? "[]"
    );

    const findSaved = (name: string) => savedRecipes.find(
        (saved) => saved.name.toLowerCase() === name.toLowerCase()
    );

    const sameContent = (saved: RecipeDetails) =>
        JSON.stringify([saved.ingredients, saved.instructions]) ===
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

    const destination = document.querySelector<HTMLInputElement>(
        'input[name="save-destination"]:checked'
    )?.value;

    const boards: RecipeBoard[] = JSON.parse(
        store.getItem("recipeBoards") ?? "[]"
    );

    if (destination === "unsorted") {
        boards.forEach((board) => {
            board.recipes = board.recipes.filter(
                (name) => name !== recipeName
            );
        });

        store.setItem(
            "recipeBoards",
            JSON.stringify(boards)
        );

        if (saveBoardMessage) {
            saveBoardMessage.textContent =
                `${recipeName} was moved to Unsorted Recipes!`;
        }

        return;
    }

    if (destination === "board") {
        if (!saveBoardSelect.value) {
            notify("Please select a board.");
            return;
        }

        const selectedBoard = boards.find(
            (board) => board.id === Number(saveBoardSelect.value)
        );

        if (!selectedBoard) {
            notify("The selected board could not be found.");
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

        store.setItem(
            "recipeBoards",
            JSON.stringify(boards)
        );

        if (saveBoardMessage) {
            saveBoardMessage.textContent =
                `${recipeName} was added to ${selectedBoard.name}!`;
        }
    }
});



export {};