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
        recipeInfo.appendChild(name);
        recipeInfo.appendChild(category);
        recipeInfo.appendChild(time);
        recipeInfo.appendChild(difficulty);
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
// Display a board card
function displayBoard(board) {
    const boardsGrid = document.querySelector(".boards-grid");
    if (!boardsGrid) {
        return;
    }
    const card = document.createElement("article");
    card.className = "board-card";
    card.dataset.boardId = String(board.id);
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
export {};
