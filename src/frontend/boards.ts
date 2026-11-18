import { recipes, type RecipeDetails } from "./recipeDetails.js";
import { store, createShareButton } from "./store.js";
interface SavedRecipe {
    name: string;
    category: string;
    time: number;
    difficulty: string;
    rating: string;
    ingredients: string[];
    instructions: string[];
}

function displaySavedRecipes(): void {


    
    const savedRecipesList =
        document.querySelector<HTMLElement>("#saved-recipes-list");

    const emptyMessage =
        document.querySelector<HTMLElement>("#no-saved-recipes");

    if (!savedRecipesList || !emptyMessage) {
        return;
    }

    const savedRecipes: SavedRecipe[] = JSON.parse(
        store.getItem("savedRecipes") ?? "[]"
    );

    savedRecipesList.replaceChildren();


const boards: RecipeBoard[] = JSON.parse(
    store.getItem("recipeBoards") ?? "[]"
);

const unsortedRecipes = savedRecipes.filter((recipe) => {
    return !boards.some((board) =>
        board.recipes.includes(recipe.name)
    );
});


    if (unsortedRecipes.length === 0) {
        emptyMessage.style.display = "";
        return;
    }

    emptyMessage.style.display = "none";

    unsortedRecipes.forEach((recipe) => {
        const card = document.createElement("article");
        card.className = "recipe-card";

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

        
        // Three-dot menu for recipe options
        const recipeMenu = document.createElement("div");
        recipeMenu.className = "board-menu";

        const menuButton = document.createElement("button");
        menuButton.type = "button";
        menuButton.className = "board-menu-button";
        menuButton.textContent = "⋮";
        menuButton.setAttribute("aria-label", "Recipe options");
        menuButton.setAttribute("aria-expanded", "false");

        const menuOptions = document.createElement("div");
        menuOptions.className = "board-menu-options";
        menuOptions.hidden = true;

        const editRecipeButton = document.createElement("button");
        editRecipeButton.type = "button";
        editRecipeButton.textContent = "Edit Recipe";


        // Open the Edit Recipe form
        editRecipeButton.addEventListener("click", () => {
            const editForm =
                document.querySelector<HTMLElement>("#edit-recipe-form");

            const nameInput =
                document.querySelector<HTMLInputElement>("#edit-recipe-name");

            const categoryInput =
                document.querySelector<HTMLSelectElement>("#edit-recipe-category");

            const timeInput =
                document.querySelector<HTMLInputElement>("#edit-recipe-time");

            const difficultyInput =
                document.querySelector<HTMLSelectElement>("#edit-recipe-difficulty");

            const ratingInput =
                document.querySelector<HTMLSelectElement>("#edit-recipe-rating");

            const ingredientsInput =
                document.querySelector<HTMLTextAreaElement>("#edit-recipe-ingredients");

            const instructionsInput =
                document.querySelector<HTMLTextAreaElement>("#edit-recipe-instructions");

            if (
                !editForm || !nameInput || !categoryInput ||
                !timeInput || !difficultyInput || !ratingInput ||
                !ingredientsInput || !instructionsInput
            ) {
                return;
            }

            // Remember the original recipe name
            editForm.dataset.recipeName = recipe.name;

            // Fill the form with the recipe's current information
            nameInput.value = recipe.name;
            categoryInput.value = recipe.category;
            timeInput.value = String(recipe.time);
            difficultyInput.value = recipe.difficulty;
            ratingInput.value = recipe.rating;
            ingredientsInput.value = recipe.ingredients.join("\n");
            instructionsInput.value = recipe.instructions.join("\n");

            // Close the menu
            menuOptions.hidden = true;
            menuButton.setAttribute("aria-expanded", "false");

            // Hide other forms
            if (createRecipeForm) createRecipeForm.hidden = true;
            if (createBoardForm) createBoardForm.hidden = true;
            if (editBoardForm) editBoardForm.hidden = true;

            // Show Edit Recipe
            editForm.hidden = false;

            editForm.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        });


        const deleteRecipeButton = document.createElement("button");
        deleteRecipeButton.type = "button";
        deleteRecipeButton.textContent = "Delete Recipe";
        deleteRecipeButton.className = "delete-board-option";


        // Permanently delete the selected recipe
        deleteRecipeButton.addEventListener("click", () => {
            const confirmed = confirm(
                `Are you sure you want to permanently delete "${recipe.name}"?`
            );

            if (!confirmed) {
                return;
            }

            // Remove the recipe from saved recipes
            const savedRecipes: SavedRecipe[] = JSON.parse(
                store.getItem("savedRecipes") ?? "[]"
            );

            const updatedRecipes = savedRecipes.filter(
                (savedRecipe) => savedRecipe.name !== recipe.name
            );

            store.setItem(
                "savedRecipes",
                JSON.stringify(updatedRecipes)
            );

            // Remove the recipe from every board
            savedBoards.forEach((board) => {
                board.recipes = board.recipes.filter(
                    (name) => name !== recipe.name
                );
            });

            store.setItem(
                "recipeBoards",
                JSON.stringify(savedBoards)
            );

            // Update recipe counts on the board cards
            savedBoards.forEach((board) => {
                const boardCard = document.querySelector<HTMLElement>(
                    `.board-card[data-board-id="${board.id}"]`
                );

                const recipeCount =
                    boardCard?.querySelector(".board-info p");

                if (recipeCount) {
                    recipeCount.textContent =
                        `${board.recipes.length} Recipes`;
                }
            });

            // Close any open recipe details
            closeOpenSections();

            // Refresh the Unsorted Recipes section
            displaySavedRecipes();

            alert(`"${recipe.name}" was deleted successfully.`);
        });

        menuButton.addEventListener("click", () => {
            menuOptions.hidden = !menuOptions.hidden;
            menuButton.setAttribute(
                "aria-expanded",
                String(!menuOptions.hidden)
            );
        });

        menuOptions.appendChild(editRecipeButton);
        menuOptions.appendChild(createShareButton("recipe", recipe.name));
        menuOptions.appendChild(deleteRecipeButton);

        recipeMenu.appendChild(menuButton);
        recipeMenu.appendChild(menuOptions);

const viewButton = document.createElement("button");
viewButton.type = "button";
viewButton.className = "view-recipe-button";
viewButton.textContent = "View Recipe";

viewButton.addEventListener("click", () => {
    closeOpenSections();

    const matchedRecipe = recipes.find(
        (savedRecipe) => savedRecipe.name === recipe.name
    );

    if (matchedRecipe) {
        displayBoardRecipe(matchedRecipe);
    } else {
        displayBoardRecipe(recipe);
    }
});


const addToBoardButton = document.createElement("button");
addToBoardButton.type = "button";
addToBoardButton.className = "view-recipe-button";
addToBoardButton.textContent = "Add to Board";



const boardPanel = document.createElement("div");
boardPanel.className = "recipe-board-panel";
boardPanel.hidden = true;

const boardLabel = document.createElement("label");
boardLabel.textContent = "Choose a board";

const boardSelect = document.createElement("select");
boardSelect.className = "recipe-board-select";

const boardActions = document.createElement("div");
boardActions.className = "recipe-board-actions";

const addToBoardConfirm = document.createElement("button");
addToBoardConfirm.type = "button";
addToBoardConfirm.className = "recipe-board-confirm";
addToBoardConfirm.textContent = "Confirm";

const cancelBoardSelection = document.createElement("button");
cancelBoardSelection.type = "button";
cancelBoardSelection.className = "recipe-board-cancel";
cancelBoardSelection.textContent = "Cancel";

boardActions.appendChild(addToBoardConfirm);
boardActions.appendChild(cancelBoardSelection);

boardPanel.appendChild(boardLabel);
boardPanel.appendChild(boardSelect);
boardPanel.appendChild(boardActions);

addToBoardButton.addEventListener("click", () => {
    const boards = savedBoards;

    if (boards.length === 0) {
        alert("You need to create a board first.");
        return;
    }

    boardSelect.replaceChildren();

    boards.forEach((board) => {
        const option = document.createElement("option");
        option.value = String(board.id);
        option.textContent = board.name;
        boardSelect.appendChild(option);
    });

    addToBoardButton.hidden = true;
    boardPanel.hidden = false;
});

cancelBoardSelection.addEventListener("click", () => {
    boardPanel.hidden = true;
    addToBoardButton.hidden = false;
});


addToBoardConfirm.addEventListener("click", () => {
    const selectedBoardId = Number(boardSelect.value);

    const boards: RecipeBoard[] = JSON.parse(
        store.getItem("recipeBoards") ?? "[]"
    );

    const selectedBoard = boards.find(
        (board) => board.id === selectedBoardId
    );

    if (!selectedBoard) {
        alert("Please select a valid board.");
        return;
    }

    if (selectedBoard.recipes.includes(recipe.name)) {
        alert("This recipe is already in the selected board.");
        return;
    }

   
    // Add the recipe to the selected board
    selectedBoard.recipes.push(recipe.name);

    // Keep the board objects used by the page synchronized
    const displayedBoard = savedBoards.find(
        (board) => board.id === selectedBoardId
    );

    if (displayedBoard) {
        displayedBoard.recipes = [...selectedBoard.recipes];
    }

    // Save the updated boards
    store.setItem(
        "recipeBoards",
        JSON.stringify(boards)
    );

    const boardCard = document.querySelector<HTMLElement>(
        `.board-card[data-board-id="${selectedBoard.id}"]`
    );

    const recipeCount = boardCard?.querySelector(".board-info p");

    if (recipeCount) {
        recipeCount.textContent =
            `${selectedBoard.recipes.length} Recipes`;
    }

    boardPanel.hidden = true;
    addToBoardButton.hidden = false;

    displaySavedRecipes();
    
    alert(`"${recipe.name}" was added to "${selectedBoard.name}"!`);
});


recipeInfo.appendChild(name);
recipeInfo.appendChild(category);
recipeInfo.appendChild(time);
recipeInfo.appendChild(difficulty);
recipeInfo.appendChild(recipeMenu);

recipeInfo.appendChild(viewButton);
recipeInfo.appendChild(addToBoardButton);
recipeInfo.appendChild(boardPanel);


card.appendChild(recipeInfo);
savedRecipesList.appendChild(card);

    });
}

displaySavedRecipes();

const createBoardButton =
    document.querySelector<HTMLButtonElement>(
        ".boards-toolbar .create-board-button"
    );

const createBoardForm =
    document.querySelector<HTMLElement>("#create-board-form");

const cancelBoardButton =
    document.querySelector<HTMLButtonElement>("#cancel-board-button");

const boardNameInput =
    document.querySelector<HTMLInputElement>("#board-name");

const newBoardForm =
    document.querySelector<HTMLFormElement>("#new-board-form");

// Open the Create Board form
createBoardButton?.addEventListener("click", () => {
    if (createBoardForm) {
        createBoardForm.hidden = false;
        boardNameInput?.focus();
    }
});

// Close the form when Cancel is clicked
cancelBoardButton?.addEventListener("click", () => {
    if (createBoardForm) {
        createBoardForm.hidden = true;
    }

    newBoardForm?.reset();
});


interface RecipeBoard {
    id: number;
    name: string;
    visibility: string;
    recipes: string[];
    coverPhoto?: string | undefined;
}


function updateEmptyBoardsMessage(): void {
    const emptyMessage =
        document.querySelector<HTMLElement>("#no-boards-message");

    if (!emptyMessage) {
        return;
    }

    const boardCount =
        document.querySelectorAll(".boards-grid .board-card").length;

    emptyMessage.hidden = boardCount > 0;
}


async function resizeBoardPhoto(file: File): Promise<string> {
    const image = await createImageBitmap(file);

    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 450;

    const context = canvas.getContext("2d");

    if (!context) {
        image.close();
        throw new Error("Could not process the image.");
    }

    // Crop the image to fill a 16:9 cover area
    const scale = Math.max(
        canvas.width / image.width,
        canvas.height / image.height
    );

    const width = image.width * scale;
    const height = image.height * scale;

    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;

    context.drawImage(image, x, y, width, height);
    image.close();

    // Compress the photo before saving it
    return canvas.toDataURL("image/jpeg", 0.75);
}


function closeOpenSections(): void {
    const boardSection =
        document.querySelector<HTMLElement>("#board-recipes-section");

    const recipeDetails =
        document.querySelector<HTMLElement>("#board-recipe-details");

    if (boardSection) {
        boardSection.hidden = true;
    }

    if (recipeDetails) {
        recipeDetails.hidden = true;
    }
}


function displayBoardRecipe(recipe: RecipeDetails): void {
    const detailsSection =
        document.querySelector<HTMLElement>("#board-recipe-details");

    const name =
        document.querySelector<HTMLElement>("#board-detail-name");

    const category =
        document.querySelector<HTMLElement>("#board-detail-category");

    const time =
        document.querySelector<HTMLElement>("#board-detail-time");

    const difficulty =
        document.querySelector<HTMLElement>("#board-detail-difficulty");

    const rating =
        document.querySelector<HTMLElement>("#board-detail-rating");

    const ingredients =
        document.querySelector<HTMLUListElement>("#board-detail-ingredients");

    const instructions =
        document.querySelector<HTMLOListElement>("#board-detail-instructions");

    if (!detailsSection || !name || !category || !time ||
        !difficulty || !rating || !ingredients || !instructions) {
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

    detailsSection.hidden = false;

    detailsSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


function openBoard(board: RecipeBoard): void {
    closeOpenSections();

    const boardSection =
        document.querySelector<HTMLElement>("#board-recipes-section");

    const boardName =
        document.querySelector<HTMLElement>("#selected-board-name");

    const recipesList =
        document.querySelector<HTMLElement>("#board-recipes-list");

    const emptyMessage =
        document.querySelector<HTMLElement>("#board-recipes-empty");

    if (!boardSection || !boardName || !recipesList || !emptyMessage) {
        return;
    }

    boardName.textContent = board.name;
    recipesList.replaceChildren();

    if (board.recipes.length === 0) {
        emptyMessage.hidden = false;
    } else {
        emptyMessage.hidden = true;

        
board.recipes.forEach((recipeName) => {
    const card = document.createElement("article");
    card.className = "recipe-card";

    const recipeTitle = document.createElement("h3");
    recipeTitle.textContent = recipeName;

    
    // Three-dot menu for recipes inside boards
    const recipeMenu = document.createElement("div");
    recipeMenu.className = "board-menu";

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "board-menu-button";
    menuButton.textContent = "⋮";
    menuButton.setAttribute("aria-label", "Recipe options");
    menuButton.setAttribute("aria-expanded", "false");

    const menuOptions = document.createElement("div");
    menuOptions.className = "board-menu-options";
    menuOptions.hidden = true;

    const editRecipeButton = document.createElement("button");
    editRecipeButton.type = "button";
    editRecipeButton.textContent = "Edit Recipe";


    // Edit a recipe from inside a board
    editRecipeButton.addEventListener("click", () => {
        const savedRecipes: SavedRecipe[] = JSON.parse(
            store.getItem("savedRecipes") ?? "[]"
        );

        const recipe = savedRecipes.find(
            (savedRecipe) => savedRecipe.name === recipeName
        );

        if (!recipe) {
            alert("This recipe cannot be edited because its saved details were not found.");
            return;
        }

        const editForm =
            document.querySelector<HTMLElement>("#edit-recipe-form");

        const nameInput =
            document.querySelector<HTMLInputElement>("#edit-recipe-name");

        const categoryInput =
            document.querySelector<HTMLSelectElement>("#edit-recipe-category");

        const timeInput =
            document.querySelector<HTMLInputElement>("#edit-recipe-time");

        const difficultyInput =
            document.querySelector<HTMLSelectElement>("#edit-recipe-difficulty");

        const ratingInput =
            document.querySelector<HTMLSelectElement>("#edit-recipe-rating");

        const ingredientsInput =
            document.querySelector<HTMLTextAreaElement>("#edit-recipe-ingredients");

        const instructionsInput =
            document.querySelector<HTMLTextAreaElement>("#edit-recipe-instructions");

        if (
            !editForm || !nameInput || !categoryInput ||
            !timeInput || !difficultyInput || !ratingInput ||
            !ingredientsInput || !instructionsInput
        ) {
            return;
        }

        // Remember which recipe is being edited
        editForm.dataset.recipeName = recipe.name;

        // Fill in the recipe's existing information
        nameInput.value = recipe.name;
        categoryInput.value = recipe.category;
        timeInput.value = String(recipe.time);
        difficultyInput.value = recipe.difficulty;
        ratingInput.value = recipe.rating;
        ingredientsInput.value = recipe.ingredients.join("\n");
        instructionsInput.value = recipe.instructions.join("\n");

        // Close the three-dot menu
        menuOptions.hidden = true;
        menuButton.setAttribute("aria-expanded", "false");

        // Hide other forms
        if (createRecipeForm) createRecipeForm.hidden = true;
        if (createBoardForm) createBoardForm.hidden = true;
        if (editBoardForm) editBoardForm.hidden = true;

        // Open the Edit Recipe form
        editForm.hidden = false;

        editForm.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });


    const deleteRecipeButton = document.createElement("button");
    deleteRecipeButton.type = "button";
    deleteRecipeButton.textContent = "Delete Recipe";
    deleteRecipeButton.className = "delete-board-option";

    
    // Permanently delete a recipe from all saved recipes and boards
    deleteRecipeButton.addEventListener("click", () => {
        const confirmed = confirm(
            `Are you sure you want to permanently delete "${recipeName}"?`
        );

        if (!confirmed) {
            return;
        }

        // Remove the recipe from savedRecipes
        const savedRecipes: SavedRecipe[] = JSON.parse(
            store.getItem("savedRecipes") ?? "[]"
        );

        const updatedRecipes = savedRecipes.filter(
            (recipe) => recipe.name !== recipeName
        );

        if (updatedRecipes.length === savedRecipes.length) {
            alert("This recipe was not found in your saved recipes.");
            return;
        }

        store.setItem(
            "savedRecipes",
            JSON.stringify(updatedRecipes)
        );

        // Remove the recipe from every board
        savedBoards.forEach((savedBoard) => {
            savedBoard.recipes = savedBoard.recipes.filter(
                (name) => name !== recipeName
            );
        });

        store.setItem(
            "recipeBoards",
            JSON.stringify(savedBoards)
        );

        // Update recipe counts on all board cards
        savedBoards.forEach((savedBoard) => {
            const boardCard = document.querySelector<HTMLElement>(
                `.board-card[data-board-id="${savedBoard.id}"]`
            );

            const recipeCount =
                boardCard?.querySelector(".board-info p");

            if (recipeCount) {
                recipeCount.textContent =
                    `${savedBoard.recipes.length} Recipes`;
            }
        });

        // Refresh Unsorted Recipes
        displaySavedRecipes();

        // Close any open recipe details
        closeOpenSections();

        // Refresh the current board
        openBoard(board);

        alert(`"${recipeName}" was deleted successfully.`);
    });


    menuButton.addEventListener("click", () => {
        menuOptions.hidden = !menuOptions.hidden;
        menuButton.setAttribute(
            "aria-expanded",
            String(!menuOptions.hidden)
        );
    });

    menuOptions.append(editRecipeButton, createShareButton("recipe", recipeName), deleteRecipeButton);
    recipeMenu.append(menuButton, menuOptions);


const viewButton = document.createElement("button");
viewButton.type = "button";
viewButton.className = "view-recipe-button";
viewButton.textContent = "View Recipe";


viewButton.addEventListener("click", () => {
    const savedRecipes: SavedRecipe[] = JSON.parse(
        store.getItem("savedRecipes") ?? "[]"
    );

    const matchedRecipe =
        savedRecipes.find((recipe) => recipe.name === recipeName) ??
        recipes.find((recipe) => recipe.name === recipeName);

    if (!matchedRecipe) {
        alert("Recipe details could not be found.");
        return;
    }

    displayBoardRecipe(matchedRecipe);
});



    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-recipe-button";
    removeButton.textContent = "Remove from Board";

    removeButton.addEventListener("click", () => {
        const confirmed = confirm(
            `Remove "${recipeName}" from "${board.name}"?`
        );

        if (!confirmed) {
            return;
        }

        // Remove the recipe from this board
        board.recipes = board.recipes.filter(
            (name) => name !== recipeName
        );

        // Save the updated boards
        store.setItem(
            "recipeBoards",
            JSON.stringify(savedBoards)
        );

        // Update the recipe count on the board card
        const boardCard = document.querySelector<HTMLElement>(
            `.board-card[data-board-id="${board.id}"]`
        );

        const recipeCount = boardCard?.querySelector(".board-info p");

        if (recipeCount) {
            recipeCount.textContent =
                `${board.recipes.length} Recipes`;
        }

       
        // Refresh the current board
        openBoard(board);

        // Refresh Unsorted Recipes immediately
        displaySavedRecipes();

    });

   card.append(recipeTitle, recipeMenu, viewButton, removeButton);
    recipesList.appendChild(card);
});

    }

    boardSection.hidden = false;

    boardSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// Display a board card
function displayBoard(board: RecipeBoard): void {
    const boardsGrid =
        document.querySelector<HTMLElement>(".boards-grid");

    if (!boardsGrid) {
        return;
    }

    const card = document.createElement("article");
    card.className = "board-card";
    card.dataset.boardId = String(board.id);


card.addEventListener("click", (event) => {
    const target = event.target;

    // Don't open the board when clicking its menu
    if (
        target instanceof Element &&
        target.closest(".board-menu")
    ) {
        return;
    }

    openBoard(board);
});

    
const image = document.createElement("div");
image.className = "board-image";

if (board.coverPhoto) {
    const coverImage = document.createElement("img");
    coverImage.src = board.coverPhoto;
    coverImage.alt = `${board.name} cover photo`;

    image.appendChild(coverImage);
} else {
    image.textContent = "📋";
}


    const info = document.createElement("div");
    info.className = "board-info";

    const name = document.createElement("h2");
    name.textContent = board.name;

    const count = document.createElement("p");
    count.textContent = `${board.recipes.length} Recipes`;

    const visibility = document.createElement("span");
    visibility.className = "board-visibility";
    visibility.textContent = board.visibility;

    info.appendChild(name);
    info.appendChild(count);
    info.appendChild(visibility);


    // Create the three-dot menu for this board
    const boardMenu = document.createElement("div");
    boardMenu.className = "board-menu";

    const menuButton = document.createElement("button");
    menuButton.type = "button";
    menuButton.className = "board-menu-button";
    menuButton.textContent = "⋮";
    menuButton.setAttribute("aria-label", "Board options");
    menuButton.setAttribute("aria-expanded", "false");

    const menuOptions = document.createElement("div");
    menuOptions.className = "board-menu-options";
    menuOptions.hidden = true;

    
    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.textContent = "Edit Board";

    // Open the Edit Board form for this specific board
    editButton.addEventListener("click", () => {
        const editBoardForm =
            document.querySelector<HTMLElement>("#edit-board-form");

        const editBoardName =
            document.querySelector<HTMLInputElement>("#edit-board-name");

        const editBoardVisibility =
            document.querySelector<HTMLSelectElement>(
                "#edit-board-visibility"
            );

        if (!editBoardForm || !editBoardName || !editBoardVisibility) {
            return;
        }

        // Fill in the selected board's information
        editBoardName.value = board.name;
        editBoardVisibility.value = board.visibility;

        // Remember which board is being edited
        editBoardForm.dataset.boardId = String(board.id);

        // Close the three-dot menu
        menuOptions.hidden = true;
        menuButton.setAttribute("aria-expanded", "false");

        // Hide Create Board and show Edit Board
        if (createBoardForm) {
            createBoardForm.hidden = true;
        }

        editBoardForm.hidden = false;

        editBoardForm.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });

    
const deleteButton = document.createElement("button");
deleteButton.type = "button";
deleteButton.textContent = "Delete Board";
deleteButton.className = "delete-board-option";


deleteButton.addEventListener("click", () => {
    const confirmed = confirm(
        `Are you sure you want to delete "${board.name}"?`
    );

    if (!confirmed) {
        return;
    }

    // Find the selected board
    const boardIndex = savedBoards.findIndex(
        (savedBoard) => savedBoard.id === board.id
    );

    if (boardIndex === -1) {
        return;
    }

    // Remove it from the saved boards
    savedBoards.splice(boardIndex, 1);

    // Update localStorage
    store.setItem(
        "recipeBoards",
        JSON.stringify(savedBoards)
    );

    // Remove its card from the page
    card.remove();

    updateEmptyBoardsMessage();

    // Close the editing form if this board was being edited
    const editForm =
        document.querySelector<HTMLElement>("#edit-board-form");

    if (editForm?.dataset.boardId === String(board.id)) {
        editForm.hidden = true;
    }
});



    menuOptions.appendChild(editButton);
    menuOptions.appendChild(createShareButton("board", String(board.id)));
    menuOptions.appendChild(deleteButton);

    boardMenu.appendChild(menuButton);
    boardMenu.appendChild(menuOptions);

    info.appendChild(boardMenu);

    menuButton.addEventListener("click", () => {
        menuOptions.hidden = !menuOptions.hidden;
        menuButton.setAttribute(
            "aria-expanded",
            String(!menuOptions.hidden)
        );
    });


    card.appendChild(image);
    card.appendChild(info);

    boardsGrid.appendChild(card);
    updateEmptyBoardsMessage();
}

// Retrieve previously created boards
const savedBoards: RecipeBoard[] = JSON.parse(
    store.getItem("recipeBoards") ?? "[]"
);

// Display boards when the page loads
savedBoards.forEach((board) => {
    displayBoard(board);
});
updateEmptyBoardsMessage();

// Handle creating a new board
newBoardForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const boardName = boardNameInput?.value.trim();

    const visibilityInput =
        document.querySelector<HTMLSelectElement>("#board-visibility");

    if (!boardName || !visibilityInput) {
        return;
    }

    
const coverInput =
    document.querySelector<HTMLInputElement>("#board-cover");

let coverPhoto: string | undefined;

if (coverInput?.files?.[0]) {
    try {
        coverPhoto = await resizeBoardPhoto(coverInput.files[0]);
    } catch (error) {
        console.error("Photo upload failed:", error);
        alert("Could not process the selected photo.");
        return;
    }
}

const newBoard: RecipeBoard = {
    id: Date.now(),
    name: boardName,
    visibility: visibilityInput.value,
    recipes: [],
    coverPhoto: coverPhoto
};


    savedBoards.push(newBoard);

    store.setItem(
        "recipeBoards",
        JSON.stringify(savedBoards)
    );

    displayBoard(newBoard);

    newBoardForm.reset();

    if (createBoardForm) {
        createBoardForm.hidden = true;
    }
});


// Edit Board form elements
const editBoardForm =
    document.querySelector<HTMLElement>("#edit-board-form");

const boardEditForm =
    document.querySelector<HTMLFormElement>("#board-edit-form");

const editBoardName =
    document.querySelector<HTMLInputElement>("#edit-board-name");

const editBoardVisibility =
    document.querySelector<HTMLSelectElement>(
        "#edit-board-visibility"
    );

const cancelEditButton =
    document.querySelector<HTMLButtonElement>("#cancel-edit-button");

// Save changes to the selected board
boardEditForm?.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!editBoardForm || !editBoardName || !editBoardVisibility) {
        return;
    }

    // Identify the board being edited
    const boardId = Number(editBoardForm.dataset.boardId);

    const board = savedBoards.find(
        (savedBoard) => savedBoard.id === boardId
    );

    if (!board) {
        alert("Board not found.");
        return;
    }

    const updatedName = editBoardName.value.trim();

    if (!updatedName) {
        alert("Please enter a board name.");
        return;
    }

    // Update the board's information
    
    // Check whether the user selected a replacement photo
    const editCoverInput =
        document.querySelector<HTMLInputElement>("#edit-board-cover");

    const removeCoverCheckbox =
        document.querySelector<HTMLInputElement>("#remove-board-cover");

    let updatedCoverPhoto = board.coverPhoto;

    if (removeCoverCheckbox?.checked) {
        // Remove the existing photo
        updatedCoverPhoto = undefined;
    } else if (editCoverInput?.files?.[0]) {
        // Replace the existing photo
        try {
            updatedCoverPhoto = await resizeBoardPhoto(
                editCoverInput.files[0]
            );
        } catch (error) {
            console.error("Could not process photo:", error);
            alert("Could not process the selected photo.");
            return;
        }
    }

    // Update the selected board
    board.name = updatedName;
    board.visibility = editBoardVisibility.value;
    board.coverPhoto = updatedCoverPhoto;


    // Save changes to localStorage
    store.setItem(
        "recipeBoards",
        JSON.stringify(savedBoards)
    );

    // Update the displayed board cards
    document.querySelectorAll<HTMLElement>(
        ".boards-grid .board-card"
    ).forEach((card) => {
        if (card.dataset.boardId === String(boardId)) {
            const name = card.querySelector("h2");
            const visibility = card.querySelector(".board-visibility");

            if (name) {
                name.textContent = board.name;
            }

            if (visibility) {
                visibility.textContent = board.visibility;
            }


const coverContainer =
    card.querySelector<HTMLElement>(".board-image");

if (coverContainer) {
    coverContainer.replaceChildren();

    if (board.coverPhoto) {
        const coverImage = document.createElement("img");
        coverImage.src = board.coverPhoto;
        coverImage.alt = `${board.name} cover photo`;

        coverContainer.appendChild(coverImage);
    } else {
        coverContainer.textContent = "📋";
    }
}

        }
    });

    // Close the editing form
    editBoardForm.hidden = true;
    boardEditForm.reset();
});

// Cancel editing without saving
cancelEditButton?.addEventListener("click", () => {
    if (editBoardForm) {
        editBoardForm.hidden = true;
    }

    boardEditForm?.reset();
});


const closeBoardButton =
    document.querySelector<HTMLButtonElement>("#close-board-recipes");

closeBoardButton?.addEventListener("click", () => {
    closeOpenSections();
});


const closeBoardRecipeButton =
    document.querySelector<HTMLButtonElement>("#close-board-recipe-details");

closeBoardRecipeButton?.addEventListener("click", () => {
    const detailsSection =
        document.querySelector<HTMLElement>("#board-recipe-details");

    if (detailsSection) {
        detailsSection.hidden = true;
    }
});


/* Create Recipe Form Controls */

const createRecipeButton = document.querySelector<HTMLButtonElement>(
    "#create-recipe-button"
);

const createRecipeForm = document.querySelector<HTMLElement>(
    "#create-recipe-form"
);

const cancelRecipeButton = document.querySelector<HTMLButtonElement>(
    "#cancel-recipe-button"
);

const newRecipeForm = document.querySelector<HTMLFormElement>(
    "#new-recipe-form"
);

// Open the Create Recipe form
createRecipeButton?.addEventListener("click", () => {
    if (!createRecipeForm) return;

    // Close the Create Board and Edit Board forms
    if (createBoardForm) createBoardForm.hidden = true;
    if (editBoardForm) editBoardForm.hidden = true;

    createRecipeForm.hidden = false;

    createRecipeForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});

// Close the Create Recipe form
cancelRecipeButton?.addEventListener("click", () => {
    if (createRecipeForm) {
        createRecipeForm.hidden = true;
    }

    newRecipeForm?.reset();
});


/* Save a Newly Created Recipe */

newRecipeForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const nameInput = document.querySelector<HTMLInputElement>("#recipe-name");
    const categoryInput = document.querySelector<HTMLSelectElement>("#recipe-category");
    const timeInput = document.querySelector<HTMLInputElement>("#recipe-time");
    const difficultyInput = document.querySelector<HTMLSelectElement>("#recipe-difficulty");
    const ratingInput = document.querySelector<HTMLSelectElement>("#recipe-rating");
    const ingredientsInput = document.querySelector<HTMLTextAreaElement>("#recipe-ingredients");
    const instructionsInput = document.querySelector<HTMLTextAreaElement>("#recipe-instructions");

    if (
        !nameInput || !categoryInput || !timeInput ||
        !difficultyInput || !ratingInput ||
        !ingredientsInput || !instructionsInput
    ) {
        return;
    }

    const name = nameInput.value.trim();
    const time = Number(timeInput.value);

    const ingredients = ingredientsInput.value
        .split("\n")
        .map((ingredient) => ingredient.trim())
        .filter((ingredient) => ingredient.length > 0);

    const instructions = instructionsInput.value
        .split("\n")
        .map((instruction) => instruction.trim())
        .filter((instruction) => instruction.length > 0);

    if (
        !name || !categoryInput.value || !difficultyInput.value ||
        !ratingInput.value || !Number.isFinite(time) || time < 1 ||
        ingredients.length === 0 || instructions.length === 0
    ) {
        alert("Please complete all recipe fields.");
        return;
    }

    const savedRecipes: SavedRecipe[] = JSON.parse(
        store.getItem("savedRecipes") ?? "[]"
    );

    const duplicateRecipe = savedRecipes.some(
        (recipe) => recipe.name.toLowerCase() === name.toLowerCase()
    );

    if (duplicateRecipe) {
        alert("A saved recipe with this name already exists.");
        return;
    }

    const newRecipe: SavedRecipe = {
        name: name,
        category: categoryInput.value,
        time: time,
        difficulty: difficultyInput.value,
        rating: ratingInput.value,
        ingredients: ingredients,
        instructions: instructions
    };

    savedRecipes.push(newRecipe);

    store.setItem("savedRecipes", JSON.stringify(savedRecipes));

    displaySavedRecipes();

    newRecipeForm.reset();

    if (createRecipeForm) {
        createRecipeForm.hidden = true;
    }

    document.querySelector("#saved-recipes-list")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
});


/* Edit Recipe Form Controls */

const editRecipeForm =
    document.querySelector<HTMLElement>("#edit-recipe-form");

const recipeEditForm =
    document.querySelector<HTMLFormElement>("#recipe-edit-form");

const cancelRecipeEditButton =
    document.querySelector<HTMLButtonElement>("#cancel-recipe-edit");

// Cancel editing without saving
cancelRecipeEditButton?.addEventListener("click", () => {
    if (editRecipeForm) {
        editRecipeForm.hidden = true;
        delete editRecipeForm.dataset.recipeName;
    }

    recipeEditForm?.reset();
});

// Save changes to an existing recipe
recipeEditForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!editRecipeForm) {
        return;
    }

    const originalName = editRecipeForm.dataset.recipeName;

    if (!originalName) {
        alert("No recipe was selected for editing.");
        return;
    }

    const nameInput =
        document.querySelector<HTMLInputElement>("#edit-recipe-name");

    const categoryInput =
        document.querySelector<HTMLSelectElement>("#edit-recipe-category");

    const timeInput =
        document.querySelector<HTMLInputElement>("#edit-recipe-time");

    const difficultyInput =
        document.querySelector<HTMLSelectElement>("#edit-recipe-difficulty");

    const ratingInput =
        document.querySelector<HTMLSelectElement>("#edit-recipe-rating");

    const ingredientsInput =
        document.querySelector<HTMLTextAreaElement>("#edit-recipe-ingredients");

    const instructionsInput =
        document.querySelector<HTMLTextAreaElement>("#edit-recipe-instructions");

    if (
        !nameInput || !categoryInput || !timeInput ||
        !difficultyInput || !ratingInput ||
        !ingredientsInput || !instructionsInput
    ) {
        return;
    }

    const updatedName = nameInput.value.trim();
    const updatedTime = Number(timeInput.value);

    const updatedIngredients = ingredientsInput.value
        .split("\n")
        .map((ingredient) => ingredient.trim())
        .filter((ingredient) => ingredient.length > 0);

    const updatedInstructions = instructionsInput.value
        .split("\n")
        .map((instruction) => instruction.trim())
        .filter((instruction) => instruction.length > 0);

    if (
        !updatedName || !categoryInput.value ||
        !difficultyInput.value || !ratingInput.value ||
        !Number.isFinite(updatedTime) || updatedTime < 1 ||
        updatedIngredients.length === 0 ||
        updatedInstructions.length === 0
    ) {
        alert("Please complete all recipe fields.");
        return;
    }

    const savedRecipes: SavedRecipe[] = JSON.parse(
        store.getItem("savedRecipes") ?? "[]"
    );

    const recipeIndex = savedRecipes.findIndex(
        (recipe) => recipe.name === originalName
    );

    if (recipeIndex === -1) {
        alert("The recipe could not be found.");
        return;
    }

    // Prevent two recipes from having the same name
    const duplicateName = savedRecipes.some(
        (recipe, index) =>
            index !== recipeIndex &&
            recipe.name.toLowerCase() === updatedName.toLowerCase()
    );

    if (duplicateName) {
        alert("Another saved recipe already has this name.");
        return;
    }

    // Update the recipe's information
    const updatedRecipe: SavedRecipe = {
        name: updatedName,
        category: categoryInput.value,
        time: updatedTime,
        difficulty: difficultyInput.value,
        rating: ratingInput.value,
        ingredients: updatedIngredients,
        instructions: updatedInstructions
    };

    savedRecipes[recipeIndex] = updatedRecipe;

    // Update recipe names in all boards
    const boards: RecipeBoard[] = JSON.parse(
        store.getItem("recipeBoards") ?? "[]"
    );

    boards.forEach((board) => {
        board.recipes = board.recipes.map((name) =>
            name === originalName ? updatedName : name
        );
    });

    // Save the changes
    store.setItem(
        "savedRecipes",
        JSON.stringify(savedRecipes)
    );

    store.setItem(
        "recipeBoards",
        JSON.stringify(boards)
    );

    // Keep the existing board objects synchronized
    savedBoards.forEach((board) => {
        const updatedBoard = boards.find(
            (item) => item.id === board.id
        );

        if (updatedBoard) {
            board.recipes = updatedBoard.recipes;
        }
    });

    // Refresh the Unsorted Recipes cards
    displaySavedRecipes();

    // Close any previously displayed recipe details
    closeOpenSections();

    // Close and reset the editing form
    editRecipeForm.hidden = true;
    delete editRecipeForm.dataset.recipeName;
    recipeEditForm.reset();

    alert(`"${updatedName}" was updated successfully!`);
});


export {};
