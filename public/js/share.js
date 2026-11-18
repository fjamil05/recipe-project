// =========================================
// Share page (share.html?t=...)
// =========================================
// Shows a recipe or board someone shared with a link.
// No login needed, and nothing here can be edited.
const shareContent = document.querySelector("#share-content");
function element(tag, text, className) {
    const el = document.createElement(tag);
    if (text !== undefined) {
        el.textContent = text;
    }
    if (className) {
        el.className = className;
    }
    return el;
}
function renderRecipe(recipe) {
    const card = element("article", undefined, "recipe-card shared-recipe");
    const info = element("div", undefined, "recipe-info");
    info.append(element("h3", recipe.name), element("p", recipe.category), element("p", `Time: ${recipe.time} minutes`), element("p", `Difficulty: ${recipe.difficulty}`), element("p", `Enjoyment Rating: ${recipe.rating}`));
    const ingredientsList = element("ul");
    recipe.ingredients.forEach((item) => ingredientsList.appendChild(element("li", item)));
    const instructionsList = element("ol");
    recipe.instructions.forEach((step) => instructionsList.appendChild(element("li", step)));
    info.append(element("h4", "Ingredients"), ingredientsList, element("h4", "Instructions"), instructionsList);
    card.appendChild(info);
    return card;
}
async function loadSharedItem() {
    if (!shareContent) {
        return;
    }
    const token = new URLSearchParams(window.location.search).get("t");
    if (!token) {
        shareContent.replaceChildren(element("p", "This share link is missing its code."));
        return;
    }
    const response = await fetch(`/api/shared/${encodeURIComponent(token)}`);
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !("type" in data)) {
        const message = "error" in data && data.error ? data.error : "This share link doesn't work.";
        shareContent.replaceChildren(element("p", message));
        return;
    }
    if (data.type === "recipe") {
        document.title = `${data.recipe.name} - Recipe Tracker`;
        shareContent.replaceChildren(element("h1", data.recipe.name), element("p", `Shared by ${data.owner}`, "shared-by"), renderRecipe(data.recipe));
        return;
    }
    document.title = `${data.board.name} - Recipe Tracker`;
    const parts = [
        element("h1", data.board.name),
        element("p", `Board shared by ${data.owner}`, "shared-by")
    ];
    if (data.board.coverPhoto) {
        const cover = element("img", undefined, "shared-board-cover");
        cover.src = data.board.coverPhoto;
        cover.alt = `${data.board.name} cover photo`;
        parts.push(cover);
    }
    if (data.board.recipes.length === 0) {
        parts.push(element("p", "This board doesn't have any recipes yet."));
    }
    const grid = element("section", undefined, "recipe-grid");
    data.board.recipes.forEach((recipe) => grid.appendChild(renderRecipe(recipe)));
    parts.push(grid);
    shareContent.replaceChildren(...parts);
}
loadSharedItem();
export {};
