
function filterRecipes(): void {
    const searchInput =
        document.querySelector<HTMLInputElement>("#recipe-search");

    const categoryFilter =
        document.querySelector<HTMLSelectElement>("#category-filter");

    const difficultyFilter =
        document.querySelector<HTMLSelectElement>("#difficulty-filter");

    const timeFilter =
        document.querySelector<HTMLSelectElement>("#time-filter");

    const recipeCards =
        document.querySelectorAll<HTMLElement>(".recipe-card");

    if (!searchInput || !categoryFilter || !difficultyFilter || !timeFilter) {
        return;
    }

    const searchText = searchInput.value.trim().toLowerCase();
    const selectedCategory = categoryFilter.value;
    const selectedDifficulty = difficultyFilter.value;
    const selectedTime = Number(timeFilter.value);

    recipeCards.forEach((card) => {
        const recipeName =
            card.querySelector("h3")?.textContent ?? "";

        const recipeInfo =
            card.querySelector(".recipe-info");

        
const paragraphs = recipeInfo?.querySelectorAll("p");

if (!paragraphs || paragraphs.length < 3) {
    return;
}

const categoryText = paragraphs.item(0)?.textContent ?? "";
const timeText = paragraphs.item(1)?.textContent ?? "";
const difficultyText = paragraphs.item(2)?.textContent ?? "";


        
const category = categoryText.trim();

const time = Number(
    timeText.match(/\d+/)?.[0] ?? 0
);

const difficulty = difficultyText
    .replace("Difficulty:", "")
    .trim();

        const matchesSearch =
            recipeName.toLowerCase().includes(searchText);

        const matchesCategory =
            selectedCategory === "" || category === selectedCategory;

        const matchesDifficulty =
            selectedDifficulty === "" || difficulty === selectedDifficulty;

        const matchesTime =
            selectedTime === 0 || time < selectedTime;

        card.style.display =
            matchesSearch &&
            matchesCategory &&
            matchesDifficulty &&
            matchesTime
                ? ""
                : "none";
    });
}

const searchInput =
    document.querySelector<HTMLInputElement>("#recipe-search");

const categoryFilter =
    document.querySelector<HTMLSelectElement>("#category-filter");

const difficultyFilter =
    document.querySelector<HTMLSelectElement>("#difficulty-filter");

const timeFilter =
    document.querySelector<HTMLSelectElement>("#time-filter");

searchInput?.addEventListener("input", filterRecipes);
categoryFilter?.addEventListener("change", filterRecipes);
difficultyFilter?.addEventListener("change", filterRecipes);
timeFilter?.addEventListener("change", filterRecipes);

export {};
