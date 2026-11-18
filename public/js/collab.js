// =========================================
// Collaborators (Boards page)
// =========================================
// Board owners can add other users by username. Collaborators can then
// add their own recipes to that board. Boards with collaborators show up
// in the "Collaborative Boards" section for everyone involved.
import { flush, store } from "./store.js";
import { api, button, el, errorText, notify, openDialog } from "./ui.js";
// ---------- Managing who is on one of your boards ----------
async function fillMembers(list, boardId) {
    const result = await api("GET", `/api/boards/${boardId}/members`);
    list.replaceChildren();
    if (!result.ok) {
        list.appendChild(el("li", errorText(result)));
        return;
    }
    if (result.data.length === 0) {
        list.appendChild(el("li", "No collaborators yet.", "collab-empty"));
        return;
    }
    result.data.forEach((username) => {
        const item = el("li", undefined, "collab-member");
        item.appendChild(el("span", username));
        item.appendChild(button("Remove", "secondary-button", async () => {
            const removed = await api("DELETE", `/api/boards/${boardId}/members/${encodeURIComponent(username)}`);
            if (!removed.ok) {
                notify(errorText(removed), "error");
                return;
            }
            notify(`${username} was removed.`, "success");
            fillMembers(list, boardId);
            loadCollaborativeBoards();
        }));
        list.appendChild(item);
    });
}
export function openCollaboratorsDialog(boardId, boardName) {
    openDialog(`Collaborators: ${boardName}`, async (body) => {
        body.appendChild(el("p", "Collaborators can add their own recipes to this board. They can't edit or delete yours.", "review-hint"));
        const list = el("ul", undefined, "collab-member-list");
        list.appendChild(el("li", "Loading..."));
        const form = el("form", undefined, "collab-add-form");
        const label = el("label", "Add someone by username");
        const input = el("input");
        input.id = "collab-username";
        input.required = true;
        input.autocomplete = "off";
        input.placeholder = "their username";
        label.htmlFor = input.id;
        const submit = el("button", "Add", "create-board-button");
        submit.type = "submit";
        const buttons = el("div", undefined, "board-form-buttons");
        buttons.appendChild(submit);
        form.append(label, input, buttons);
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const result = await api("POST", `/api/boards/${boardId}/members`, { username: input.value.trim() });
            if (!result.ok) {
                notify(errorText(result), "error");
                return;
            }
            notify(`${input.value.trim()} can now add recipes to ${boardName}.`, "success");
            input.value = "";
            fillMembers(list, boardId);
            loadCollaborativeBoards();
        });
        body.append(list, form);
        // Make sure the board exists on the server before looking it up
        await flush();
        fillMembers(list, boardId);
    });
}
export function createCollaboratorsButton(boardId, boardName) {
    return button("Collaborators", "", () => openCollaboratorsDialog(boardId, boardName));
}
// ---------- The Collaborative Boards section ----------
function recipeEntry(board, recipe) {
    const item = el("li", undefined, "collab-recipe");
    const details = el("details");
    const summary = el("summary");
    summary.append(el("strong", recipe.name), el("span", ` · added by ${recipe.addedByMe ? "you" : recipe.addedBy}`, "collab-added-by"));
    const ingredients = el("ul");
    recipe.ingredients.forEach((ingredient) => ingredients.appendChild(el("li", ingredient)));
    const steps = el("ol");
    recipe.instructions.forEach((step) => steps.appendChild(el("li", step)));
    details.append(summary, el("p", `${recipe.category} · ${recipe.time} minutes · ${recipe.difficulty}`), el("h4", "Ingredients"), ingredients, el("h4", "Instructions"), steps);
    item.appendChild(details);
    // Owners can remove recipes collaborators added; collaborators can remove their own
    const canRemove = board.isOwner ? !recipe.addedByMe : recipe.addedByMe;
    if (canRemove) {
        item.appendChild(button("Remove", "secondary-button", async () => {
            const result = await api("DELETE", `/api/collab-boards/${board.boardId}/recipes/${recipe.id}`);
            if (!result.ok) {
                notify(errorText(result), "error");
                return;
            }
            notify(`${recipe.name} was removed from ${board.name}.`, "success");
            loadCollaborativeBoards();
        }));
    }
    return item;
}
function addRecipeForm(board) {
    const form = el("form", undefined, "collab-add-form");
    const select = el("select");
    select.id = `collab-add-${board.boardId}`;
    select.required = true;
    const label = el("label", "Add one of your recipes");
    label.htmlFor = select.id;
    const placeholder = el("option", "Choose a recipe");
    placeholder.value = "";
    select.appendChild(placeholder);
    const alreadyAdded = new Set(board.recipes.filter((r) => r.addedByMe).map((r) => r.name));
    const saved = JSON.parse(store.getItem("savedRecipes") ?? "[]");
    saved
        .filter((recipe) => !alreadyAdded.has(recipe.name))
        .forEach((recipe) => {
        const option = el("option", recipe.name);
        option.value = recipe.name;
        select.appendChild(option);
    });
    const submit = el("button", "Add", "create-board-button");
    submit.type = "submit";
    const buttons = el("div", undefined, "board-form-buttons");
    buttons.appendChild(submit);
    form.append(label, select, buttons);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        await flush();
        const result = await api("POST", `/api/collab-boards/${board.boardId}/recipes`, { name: select.value });
        if (!result.ok) {
            notify(errorText(result), "error");
            return;
        }
        notify(`${select.value} was added to ${board.name}!`, "success");
        loadCollaborativeBoards();
    });
    return form;
}
export async function loadCollaborativeBoards() {
    const container = document.querySelector("#collab-boards");
    if (!container) {
        return;
    }
    const result = await api("GET", "/api/collab-boards");
    container.replaceChildren();
    if (!result.ok) {
        container.appendChild(el("p", errorText(result, "Collaborative boards couldn't be loaded.")));
        return;
    }
    if (result.data.length === 0) {
        container.appendChild(el("p", "No collaborative boards yet. Open a board's ⋮ menu and choose Collaborators to invite someone.", "collab-empty"));
        return;
    }
    result.data.forEach((board) => {
        const card = el("article", undefined, "collab-board recipe-card");
        const info = el("div", undefined, "recipe-info");
        info.append(el("h3", board.name), el("p", board.isOwner
            ? `Your board · with ${board.members.join(", ")}`
            : `${board.owner}'s board · with ${[board.owner, ...board.members.filter((m) => m !== board.owner)].join(", ")}`));
        const list = el("ul", undefined, "collab-recipe-list");
        if (board.recipes.length === 0) {
            list.appendChild(el("li", "No recipes yet.", "collab-empty"));
        }
        board.recipes.forEach((recipe) => list.appendChild(recipeEntry(board, recipe)));
        info.appendChild(list);
        if (!board.isOwner) {
            info.appendChild(addRecipeForm(board));
        }
        card.appendChild(info);
        container.appendChild(card);
    });
}
loadCollaborativeBoards();
