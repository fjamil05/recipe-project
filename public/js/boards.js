import { recipes } from "./recipeDetails.js";
function displaySavedRecipes() {
    const savedRecipesList = document.querySelector("#saved-recipes-list");
    const emptyMessage = document.querySelector("#no-saved-recipes");
    if (!savedRecipesList || !emptyMessage) {
        return;
    }
    const savedRecipes = JSON.parse(localStorage.getItem("savedRecipes") ?? "[]");
    savedRecipesList.replaceChildren();
    if (savedRecipes.length === 0) {
        emptyMessage.style.display = "";
        return;
    }
    emptyMessage.style.display = "none";
    savedRecipes.forEach((recipe) => {
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
        const viewButton = document.createElement("button");
        viewButton.type = "button";
        viewButton.className = "view-recipe-button";
        viewButton.textContent = "View Recipe";
        viewButton.addEventListener("click", () => {
            closeOpenSections();
            const matchedRecipe = recipes.find((savedRecipe) => savedRecipe.name === recipe.name);
            if (matchedRecipe) {
                displayBoardRecipe(matchedRecipe);
            }
            else {
                displayBoardRecipe(recipe);
            }
        });
        const addToBoardButton = document.createElement("button");
        addToBoardButton.type = "button";
        addToBoardButton.className = "view-recipe-button";
        addToBoardButton.textContent = "Add to Board";
        recipeInfo.appendChild(name);
        recipeInfo.appendChild(category);
        recipeInfo.appendChild(time);
        recipeInfo.appendChild(difficulty);
        recipeInfo.appendChild(viewButton);
        recipeInfo.appendChild(addToBoardButton);
        card.appendChild(recipeInfo);
        savedRecipesList.appendChild(card);
    });
}
displaySavedRecipes();
const createBoardButton = document.querySelector(".boards-toolbar .create-board-button");
const createBoardForm = document.querySelector("#create-board-form");
const cancelBoardButton = document.querySelector("#cancel-board-button");
const boardNameInput = document.querySelector("#board-name");
const newBoardForm = document.querySelector("#new-board-form");
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
function updateEmptyBoardsMessage() {
    const emptyMessage = document.querySelector("#no-boards-message");
    if (!emptyMessage) {
        return;
    }
    const boardCount = document.querySelectorAll(".boards-grid .board-card").length;
    emptyMessage.hidden = boardCount > 0;
}
async function resizeBoardPhoto(file) {
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
    const scale = Math.max(canvas.width / image.width, canvas.height / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;
    context.drawImage(image, x, y, width, height);
    image.close();
    // Compress the photo before saving it
    return canvas.toDataURL("image/jpeg", 0.75);
}
function closeOpenSections() {
    const boardSection = document.querySelector("#board-recipes-section");
    const recipeDetails = document.querySelector("#board-recipe-details");
    if (boardSection) {
        boardSection.hidden = true;
    }
    if (recipeDetails) {
        recipeDetails.hidden = true;
    }
}
function displayBoardRecipe(recipe) {
    const detailsSection = document.querySelector("#board-recipe-details");
    const name = document.querySelector("#board-detail-name");
    const category = document.querySelector("#board-detail-category");
    const time = document.querySelector("#board-detail-time");
    const difficulty = document.querySelector("#board-detail-difficulty");
    const rating = document.querySelector("#board-detail-rating");
    const ingredients = document.querySelector("#board-detail-ingredients");
    const instructions = document.querySelector("#board-detail-instructions");
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
function openBoard(board) {
    closeOpenSections();
    const boardSection = document.querySelector("#board-recipes-section");
    const boardName = document.querySelector("#selected-board-name");
    const recipesList = document.querySelector("#board-recipes-list");
    const emptyMessage = document.querySelector("#board-recipes-empty");
    if (!boardSection || !boardName || !recipesList || !emptyMessage) {
        return;
    }
    boardName.textContent = board.name;
    recipesList.replaceChildren();
    if (board.recipes.length === 0) {
        emptyMessage.hidden = false;
    }
    else {
        emptyMessage.hidden = true;
        board.recipes.forEach((recipeName) => {
            const card = document.createElement("article");
            card.className = "recipe-card";
            const recipeTitle = document.createElement("h3");
            recipeTitle.textContent = recipeName;
            const viewButton = document.createElement("button");
            viewButton.type = "button";
            viewButton.className = "view-recipe-button";
            viewButton.textContent = "View Recipe";
            viewButton.addEventListener("click", () => {
                const matchedRecipe = recipes.find((recipe) => recipe.name === recipeName);
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
                const confirmed = confirm(`Remove "${recipeName}" from "${board.name}"?`);
                if (!confirmed) {
                    return;
                }
                // Remove the recipe from this board
                board.recipes = board.recipes.filter((name) => name !== recipeName);
                // Save the updated boards
                localStorage.setItem("recipeBoards", JSON.stringify(savedBoards));
                // Update the recipe count on the board card
                const boardCard = document.querySelector(`.board-card[data-board-id="${board.id}"]`);
                const recipeCount = boardCard?.querySelector(".board-info p");
                if (recipeCount) {
                    recipeCount.textContent =
                        `${board.recipes.length} Recipes`;
                }
                // Refresh the displayed recipes
                openBoard(board);
            });
            card.append(recipeTitle, viewButton, removeButton);
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
function displayBoard(board) {
    const boardsGrid = document.querySelector(".boards-grid");
    if (!boardsGrid) {
        return;
    }
    const card = document.createElement("article");
    card.className = "board-card";
    card.dataset.boardId = String(board.id);
    card.addEventListener("click", (event) => {
        const target = event.target;
        // Don't open the board when clicking its menu
        if (target instanceof Element &&
            target.closest(".board-menu")) {
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
    }
    else {
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
        const editBoardForm = document.querySelector("#edit-board-form");
        const editBoardName = document.querySelector("#edit-board-name");
        const editBoardVisibility = document.querySelector("#edit-board-visibility");
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
        const confirmed = confirm(`Are you sure you want to delete "${board.name}"?`);
        if (!confirmed) {
            return;
        }
        // Find the selected board
        const boardIndex = savedBoards.findIndex((savedBoard) => savedBoard.id === board.id);
        if (boardIndex === -1) {
            return;
        }
        // Remove it from the saved boards
        savedBoards.splice(boardIndex, 1);
        // Update localStorage
        localStorage.setItem("recipeBoards", JSON.stringify(savedBoards));
        // Remove its card from the page
        card.remove();
        updateEmptyBoardsMessage();
        // Close the editing form if this board was being edited
        const editForm = document.querySelector("#edit-board-form");
        if (editForm?.dataset.boardId === String(board.id)) {
            editForm.hidden = true;
        }
    });
    menuOptions.appendChild(editButton);
    menuOptions.appendChild(deleteButton);
    boardMenu.appendChild(menuButton);
    boardMenu.appendChild(menuOptions);
    info.appendChild(boardMenu);
    menuButton.addEventListener("click", () => {
        menuOptions.hidden = !menuOptions.hidden;
        menuButton.setAttribute("aria-expanded", String(!menuOptions.hidden));
    });
    card.appendChild(image);
    card.appendChild(info);
    boardsGrid.appendChild(card);
    updateEmptyBoardsMessage();
}
// Retrieve previously created boards
const savedBoards = JSON.parse(localStorage.getItem("recipeBoards") ?? "[]");
// Display boards when the page loads
savedBoards.forEach((board) => {
    displayBoard(board);
});
updateEmptyBoardsMessage();
// Handle creating a new board
newBoardForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const boardName = boardNameInput?.value.trim();
    const visibilityInput = document.querySelector("#board-visibility");
    if (!boardName || !visibilityInput) {
        return;
    }
    const coverInput = document.querySelector("#board-cover");
    let coverPhoto;
    if (coverInput?.files?.[0]) {
        try {
            coverPhoto = await resizeBoardPhoto(coverInput.files[0]);
        }
        catch (error) {
            console.error("Photo upload failed:", error);
            alert("Could not process the selected photo.");
            return;
        }
    }
    const newBoard = {
        id: Date.now(),
        name: boardName,
        visibility: visibilityInput.value,
        recipes: [],
        coverPhoto: coverPhoto
    };
    savedBoards.push(newBoard);
    localStorage.setItem("recipeBoards", JSON.stringify(savedBoards));
    displayBoard(newBoard);
    newBoardForm.reset();
    if (createBoardForm) {
        createBoardForm.hidden = true;
    }
});
// Edit Board form elements
const editBoardForm = document.querySelector("#edit-board-form");
const boardEditForm = document.querySelector("#board-edit-form");
const editBoardName = document.querySelector("#edit-board-name");
const editBoardVisibility = document.querySelector("#edit-board-visibility");
const cancelEditButton = document.querySelector("#cancel-edit-button");
// Save changes to the selected board
boardEditForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editBoardForm || !editBoardName || !editBoardVisibility) {
        return;
    }
    // Identify the board being edited
    const boardId = Number(editBoardForm.dataset.boardId);
    const board = savedBoards.find((savedBoard) => savedBoard.id === boardId);
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
    const editCoverInput = document.querySelector("#edit-board-cover");
    const removeCoverCheckbox = document.querySelector("#remove-board-cover");
    let updatedCoverPhoto = board.coverPhoto;
    if (removeCoverCheckbox?.checked) {
        // Remove the existing photo
        updatedCoverPhoto = undefined;
    }
    else if (editCoverInput?.files?.[0]) {
        // Replace the existing photo
        try {
            updatedCoverPhoto = await resizeBoardPhoto(editCoverInput.files[0]);
        }
        catch (error) {
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
    localStorage.setItem("recipeBoards", JSON.stringify(savedBoards));
    // Update the displayed board cards
    document.querySelectorAll(".boards-grid .board-card").forEach((card) => {
        if (card.dataset.boardId === String(boardId)) {
            const name = card.querySelector("h2");
            const visibility = card.querySelector(".board-visibility");
            if (name) {
                name.textContent = board.name;
            }
            if (visibility) {
                visibility.textContent = board.visibility;
            }
            const coverContainer = card.querySelector(".board-image");
            if (coverContainer) {
                coverContainer.replaceChildren();
                if (board.coverPhoto) {
                    const coverImage = document.createElement("img");
                    coverImage.src = board.coverPhoto;
                    coverImage.alt = `${board.name} cover photo`;
                    coverContainer.appendChild(coverImage);
                }
                else {
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
const closeBoardButton = document.querySelector("#close-board-recipes");
closeBoardButton?.addEventListener("click", () => {
    closeOpenSections();
});
const closeBoardRecipeButton = document.querySelector("#close-board-recipe-details");
closeBoardRecipeButton?.addEventListener("click", () => {
    const detailsSection = document.querySelector("#board-recipe-details");
    if (detailsSection) {
        detailsSection.hidden = true;
    }
});
/* Create Recipe Form Controls */
const createRecipeButton = document.querySelector("#create-recipe-button");
const createRecipeForm = document.querySelector("#create-recipe-form");
const cancelRecipeButton = document.querySelector("#cancel-recipe-button");
const newRecipeForm = document.querySelector("#new-recipe-form");
// Open the Create Recipe form
createRecipeButton?.addEventListener("click", () => {
    if (!createRecipeForm)
        return;
    // Close the Create Board and Edit Board forms
    if (createBoardForm)
        createBoardForm.hidden = true;
    if (editBoardForm)
        editBoardForm.hidden = true;
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
    const nameInput = document.querySelector("#recipe-name");
    const categoryInput = document.querySelector("#recipe-category");
    const timeInput = document.querySelector("#recipe-time");
    const difficultyInput = document.querySelector("#recipe-difficulty");
    const ratingInput = document.querySelector("#recipe-rating");
    const ingredientsInput = document.querySelector("#recipe-ingredients");
    const instructionsInput = document.querySelector("#recipe-instructions");
    if (!nameInput || !categoryInput || !timeInput ||
        !difficultyInput || !ratingInput ||
        !ingredientsInput || !instructionsInput) {
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
    if (!name || !categoryInput.value || !difficultyInput.value ||
        !ratingInput.value || !Number.isFinite(time) || time < 1 ||
        ingredients.length === 0 || instructions.length === 0) {
        alert("Please complete all recipe fields.");
        return;
    }
    const savedRecipes = JSON.parse(localStorage.getItem("savedRecipes") ?? "[]");
    const duplicateRecipe = savedRecipes.some((recipe) => recipe.name.toLowerCase() === name.toLowerCase());
    if (duplicateRecipe) {
        alert("A saved recipe with this name already exists.");
        return;
    }
    const newRecipe = {
        name: name,
        category: categoryInput.value,
        time: time,
        difficulty: difficultyInput.value,
        rating: ratingInput.value,
        ingredients: ingredients,
        instructions: instructions
    };
    savedRecipes.push(newRecipe);
    localStorage.setItem("savedRecipes", JSON.stringify(savedRecipes));
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
