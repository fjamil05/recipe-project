import { store } from "./store.js";
import { notify, el, api } from "./ui.js";
import { renderGroceryList } from "./grocery.js";
const previousWeekButton = document.querySelector("#previous-week");
const nextWeekButton = document.querySelector("#next-week");
const currentWeekHeading = document.querySelector("#current-week");
const dayHeadings = document.querySelectorAll(".task-column h3");
// Start with today's date
const today = new Date();
// Find Monday of the current week
const currentMonday = new Date(today);
const dayOfWeek = currentMonday.getDay();
const daysSinceMonday = (dayOfWeek + 6) % 7;
currentMonday.setDate(currentMonday.getDate() - daysSinceMonday);
currentMonday.setHours(0, 0, 0, 0);
// The week currently being displayed
let displayedMonday = new Date(currentMonday);
function displayWeek() {
    if (!currentWeekHeading) {
        return;
    }
    // Sunday is six days after Monday
    const sunday = new Date(displayedMonday);
    sunday.setDate(sunday.getDate() + 6);
    const dateOptions = {
        month: "short",
        day: "numeric"
    };
    const startDate = displayedMonday.toLocaleDateString("en-US", dateOptions);
    const endDate = sunday.toLocaleDateString("en-US", {
        ...dateOptions,
        year: "numeric"
    });
    currentWeekHeading.textContent =
        `${startDate} - ${endDate}`;
    // Display the date under each weekday
    dayHeadings.forEach((heading, index) => {
        const date = new Date(displayedMonday);
        date.setDate(date.getDate() + index);
        const dayName = date.toLocaleDateString("en-US", {
            weekday: "long"
        });
        const formattedDate = date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric"
        });
        heading.replaceChildren();
        const dayText = document.createElement("span");
        dayText.className = "planner-day-name";
        dayText.textContent = dayName;
        const dateText = document.createElement("span");
        dateText.className = "planner-day-date";
        dateText.textContent = formattedDate.replace(/^([A-Za-z]{3}) /, "$1. ");
        heading.append(dayText, dateText);
    });
}
// Go back one week
previousWeekButton?.addEventListener("click", () => {
    displayedMonday.setDate(displayedMonday.getDate() - 7);
    displayWeek();
    displayPlannedRecipes();
});
// Go forward one week
nextWeekButton?.addEventListener("click", () => {
    displayedMonday.setDate(displayedMonday.getDate() + 7);
    displayWeek();
    displayPlannedRecipes();
});
// Display the current week when the page loads
displayWeek();
const addRecipeButtons = document.querySelectorAll(".add-planned-recipe");
const plannerForm = document.querySelector("#planner-recipe-form");
const addPlannerRecipeForm = document.querySelector("#add-planner-recipe-form");
const plannerRecipeSelect = document.querySelector("#planner-recipe-select");
const cancelPlannerRecipeButton = document.querySelector("#cancel-planner-recipe");
const plannedRecipeContainers = document.querySelectorAll(".planned-recipes");
const editPlannerForm = document.querySelector("#edit-planner-form");
const editPlannerRecipeForm = document.querySelector("#edit-planner-recipe-form");
const editPlannerDate = document.querySelector("#edit-planner-date");
const cancelPlannerEditButton = document.querySelector("#cancel-planner-edit");
// Identifies which scheduled recipe is being edited
let editingPlannedRecipeId = null;
// Store the date selected by the user
let selectedPlannerDate = "";
// Format dates as YYYY-MM-DD using local time
function formatPlannerDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
// Display recipes for the selected week
function displayPlannedRecipes() {
    // Keep the grocery list in sync with the week being shown
    renderGroceryList(displayedMonday);
    const plannedRecipes = JSON.parse(store.getItem("plannedRecipes") ?? "[]");
    plannedRecipeContainers.forEach((container, index) => {
        container.replaceChildren();
        const date = new Date(displayedMonday);
        date.setDate(date.getDate() + index);
        const dateKey = formatPlannerDate(date);
        const recipesForDay = plannedRecipes.filter((recipe) => recipe.date === dateKey);
        recipesForDay.forEach((recipe) => {
            const card = document.createElement("div");
            card.className = "task-card";
            const recipeName = document.createElement("span");
            recipeName.className = "planned-recipe-name";
            recipeName.textContent = recipe.recipeName;
            // Completion checkbox
            const completionCheckbox = document.createElement("input");
            completionCheckbox.type = "checkbox";
            completionCheckbox.className = "planner-completion-checkbox";
            completionCheckbox.checked = recipe.completed;
            // Display completed recipes differently
            if (recipe.completed) {
                card.classList.add("completed");
            }
            completionCheckbox.addEventListener("change", () => {
                const plannedRecipes = JSON.parse(store.getItem("plannedRecipes") ?? "[]");
                const recipeToUpdate = plannedRecipes.find((plan) => plan.id === recipe.id);
                if (!recipeToUpdate) {
                    return;
                }
                recipeToUpdate.completed = completionCheckbox.checked;
                store.setItem("plannedRecipes", JSON.stringify(plannedRecipes));
                card.classList.toggle("completed", completionCheckbox.checked);
            });
            // Three-dot menu
            const recipeMenu = document.createElement("div");
            recipeMenu.className = "planner-recipe-menu";
            const menuButton = document.createElement("button");
            menuButton.type = "button";
            menuButton.className = "planner-menu-button";
            menuButton.textContent = "⋮";
            menuButton.setAttribute("aria-label", "Recipe options");
            menuButton.setAttribute("aria-expanded", "false");
            const menuOptions = document.createElement("div");
            menuOptions.className = "planner-menu-options";
            menuOptions.hidden = true;
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "Reschedule Recipe";
            editButton.addEventListener("click", () => {
                if (!editPlannerForm || !editPlannerDate) {
                    return;
                }
                editingPlannedRecipeId = recipe.id;
                editPlannerDate.value = recipe.date;
                // Close the three-dot menu
                menuOptions.hidden = true;
                menuButton.setAttribute("aria-expanded", "false");
                // Close the Add Recipe form
                if (plannerForm) {
                    plannerForm.hidden = true;
                }
                // Show the Reschedule Recipe form
                editPlannerForm.hidden = false;
                editPlannerForm.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            });
            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Remove from Planner";
            deleteButton.className = "planner-delete-option";
            deleteButton.addEventListener("click", () => {
                const confirmed = confirm(`Remove "${recipe.recipeName}" from this day?`);
                if (!confirmed) {
                    return;
                }
                const savedPlans = JSON.parse(store.getItem("plannedRecipes") ?? "[]");
                const updatedPlans = savedPlans.filter((plan) => plan.id !== recipe.id);
                store.setItem("plannedRecipes", JSON.stringify(updatedPlans));
                displayPlannedRecipes();
            });
            menuButton.addEventListener("click", () => {
                const shouldOpen = menuOptions.hidden;
                // Close all other open recipe menus
                document.querySelectorAll(".planner-menu-options").forEach((otherMenu) => {
                    otherMenu.hidden = true;
                    const otherButton = otherMenu.parentElement
                        ?.querySelector(".planner-menu-button");
                    otherButton?.setAttribute("aria-expanded", "false");
                });
                // Open the selected menu, or leave it closed
                menuOptions.hidden = !shouldOpen;
                menuButton.setAttribute("aria-expanded", String(shouldOpen));
            });
            menuOptions.append(editButton, deleteButton);
            recipeMenu.append(menuButton, menuOptions);
            card.append(completionCheckbox, recipeName, recipeMenu);
            container.appendChild(card);
        });
    });
}
// Open the Add Recipe form for a specific day
addRecipeButtons.forEach((button, index) => {
    button.addEventListener("click", () => {
        if (!plannerForm || !plannerRecipeSelect) {
            return;
        }
        const date = new Date(displayedMonday);
        date.setDate(date.getDate() + index);
        selectedPlannerDate = formatPlannerDate(date);
        const savedRecipes = JSON.parse(store.getItem("savedRecipes") ?? "[]");
        plannerRecipeSelect.replaceChildren();
        const defaultOption = document.createElement("option");
        defaultOption.value = "";
        defaultOption.textContent = "Choose a recipe";
        plannerRecipeSelect.appendChild(defaultOption);
        savedRecipes.forEach((recipe) => {
            const option = document.createElement("option");
            option.value = recipe.name;
            option.textContent = recipe.name;
            plannerRecipeSelect.appendChild(option);
        });
        if (editPlannerForm) {
            editPlannerForm.hidden = true;
        }
        editingPlannedRecipeId = null;
        plannerForm.hidden = false;
        plannerForm.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
});
// Save the selected recipe to the planner
addPlannerRecipeForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!plannerRecipeSelect || !selectedPlannerDate) {
        return;
    }
    const recipeName = plannerRecipeSelect.value;
    if (!recipeName) {
        return;
    }
    const plannedRecipes = JSON.parse(store.getItem("plannedRecipes") ?? "[]");
    const newPlannedRecipe = {
        id: Date.now(),
        recipeName: recipeName,
        date: selectedPlannerDate,
        completed: false
    };
    plannedRecipes.push(newPlannedRecipe);
    store.setItem("plannedRecipes", JSON.stringify(plannedRecipes));
    plannerForm.hidden = true;
    addPlannerRecipeForm.reset();
    selectedPlannerDate = "";
    displayPlannedRecipes();
});
// Cancel adding a recipe
cancelPlannerRecipeButton?.addEventListener("click", () => {
    if (plannerForm) {
        plannerForm.hidden = true;
    }
    selectedPlannerDate = "";
});
editPlannerRecipeForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (editingPlannedRecipeId === null || !editPlannerDate) {
        return;
    }
    const updatedDate = editPlannerDate.value;
    if (!updatedDate) {
        return;
    }
    const plannedRecipes = JSON.parse(store.getItem("plannedRecipes") ?? "[]");
    const recipeToEdit = plannedRecipes.find((recipe) => recipe.id === editingPlannedRecipeId);
    if (!recipeToEdit) {
        notify("The planned recipe could not be found.");
        return;
    }
    // Change the date without changing the recipe
    recipeToEdit.date = updatedDate;
    store.setItem("plannedRecipes", JSON.stringify(plannedRecipes));
    if (editPlannerForm) {
        editPlannerForm.hidden = true;
    }
    editPlannerRecipeForm.reset();
    editingPlannedRecipeId = null;
    displayPlannedRecipes();
});
// Cancel editing
cancelPlannerEditButton?.addEventListener("click", () => {
    if (editPlannerForm) {
        editPlannerForm.hidden = true;
    }
    editPlannerRecipeForm?.reset();
    editingPlannedRecipeId = null;
});
// Load recipes when the page opens
displayPlannedRecipes();
// =========================================
// Collaborators
// =========================================
// Everyone you share at least one board with
async function loadCollaborators() {
    const container = document.querySelector("#team-members");
    if (!container) {
        return;
    }
    const result = await api("GET", "/api/collaborators");
    container.replaceChildren();
    if (!result.ok || result.data.length === 0) {
        container.appendChild(el("p", "No collaborators yet. On the Boards page, open a board's ⋮ menu and choose Collaborators to invite someone.", "collab-empty"));
        return;
    }
    result.data.forEach((username) => {
        const member = el("div", undefined, "member");
        member.append(el("div", username.charAt(0).toUpperCase(), "member-avatar"), el("p", username));
        container.appendChild(member);
    });
}
loadCollaborators();
