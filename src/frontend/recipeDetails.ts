
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

export const recipes: RecipeDetails[] = [
    {
        name: "Fluffy Pancakes",
        category: "Breakfast",
        time: 20,
        difficulty: "Easy",
        rating: "★★★★★",
        ingredients: [
            "1 cup all-purpose flour",
            "1 tablespoon sugar",
            "2 teaspoons baking powder",
            "1 egg",
            "3/4 cup milk"
        ],
        instructions: [
            "Combine the dry ingredients.",
            "Mix in the egg and milk.",
            "Heat a lightly greased pan.",
            "Pour batter into the pan.",
            "Cook until golden on both sides."
        ]
    },
    {
        name: "Spaghetti",
        category: "Dinner",
        time: 35,
        difficulty: "Easy",
        rating: "★★★★☆",
        ingredients: [
            "8 oz spaghetti",
            "1 cup tomato sauce",
            "1 tablespoon olive oil",
            "1 clove garlic",
            "Salt and pepper"
        ],
        instructions: [
            "Boil the spaghetti according to package directions.",
            "Heat olive oil and garlic in a pan.",
            "Add tomato sauce and simmer.",
            "Drain the spaghetti.",
            "Combine spaghetti with sauce and serve."
        ]
    },
    {
        name: "Chocolate Chip Cookies",
        category: "Dessert",
        time: 30,
        difficulty: "Medium",
        rating: "★★★★★",
        ingredients: [
            "1 cup flour",
            "1/2 cup butter",
            "1/2 cup sugar",
            "1 egg",
            "1/2 cup chocolate chips"
        ],
        instructions: [
            "Preheat oven to 350°F.",
            "Cream butter and sugar.",
            "Mix in the egg and flour.",
            "Fold in chocolate chips.",
            "Bake for 10–12 minutes."
        ]
    }
];

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

    document.querySelector("#recipe-details")?.scrollIntoView({
        behavior: "smooth"
    });
}

const recipeCards =
    document.querySelectorAll<HTMLElement>(".recipe-card");

recipeCards.forEach((card) => {
    const button =
        card.querySelector<HTMLButtonElement>(".view-recipe-button");

    button?.addEventListener("click", () => {
        const recipeName =
            card.querySelector("h3")?.textContent?.trim();

        const matchedRecipe = recipes.find(
            (recipe) => recipe.name === recipeName
        );

        if (matchedRecipe) {
            displayRecipe(matchedRecipe);
        }
    });
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

const cancelSaveBoardButton =
    document.querySelector<HTMLButtonElement>("#cancel-save-board");

saveToBoardButton?.addEventListener("click", () => {
    if (!selectedRecipe || !saveToBoardPanel || !saveBoardSelect) {
        alert("Please select a recipe first.");
        return;
    }

    // Load the user's existing boards
    const boards: RecipeBoard[] = JSON.parse(
        localStorage.getItem("recipeBoards") ?? "[]"
    );

    // Clear the dropdown
    saveBoardSelect.replaceChildren();

    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "Select a board";
    saveBoardSelect.appendChild(defaultOption);

    // Add each existing board
    boards.forEach((board) => {
        const option = document.createElement("option");
        option.value = String(board.id);
        option.textContent = board.name;
        saveBoardSelect.appendChild(option);
    });

    if (boards.length === 0) {
        alert("You don't have any boards yet. Create one on the Boards page.");
        return;
    }

    saveToBoardPanel.hidden = false;
    saveBoardSelect.focus();
});

cancelSaveBoardButton?.addEventListener("click", () => {
    if (saveToBoardPanel) {
        saveToBoardPanel.hidden = true;
    }
});


const confirmSaveBoardButton =
    document.querySelector<HTMLButtonElement>("#confirm-save-board");

const saveBoardMessage =
    document.querySelector<HTMLElement>("#save-board-message");

confirmSaveBoardButton?.addEventListener("click", () => {
    if (!selectedRecipe || !saveBoardSelect) {
        return;
    }

    // Make sure the user selected a board
    const selectedBoardId = Number(saveBoardSelect.value);

    if (!saveBoardSelect.value) {
        alert("Please select a board.");
        return;
    }

    // Load the user's boards
    const boards: RecipeBoard[] = JSON.parse(
        localStorage.getItem("recipeBoards") ?? "[]"
    );

    // Find the selected board
    const board = boards.find(
        (savedBoard) => savedBoard.id === selectedBoardId
    );

    if (!board) {
        alert("The selected board could not be found.");
        return;
    }

    // Check whether the recipe is already on this board
    const alreadySaved = board.recipes.includes(selectedRecipe.name);

    if (alreadySaved) {
        if (saveBoardMessage) {
            saveBoardMessage.textContent =
                "This recipe is already saved to this board.";
        }
        return;
    }

    // Add the recipe to the selected board
    board.recipes.push(selectedRecipe.name);

    // Save the updated boards
    localStorage.setItem(
        "recipeBoards",
        JSON.stringify(boards)
    );

    if (saveBoardMessage) {
        saveBoardMessage.textContent =
            `${selectedRecipe.name} was saved to ${board.name}!`;
    }
});


export {};
