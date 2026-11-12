let selectedRecipe = null;
const recipes = [
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
const recipeCards = document.querySelectorAll(".recipe-card");
recipeCards.forEach((card) => {
    const button = card.querySelector(".view-recipe-button");
    button?.addEventListener("click", () => {
        const recipeName = card.querySelector("h3")?.textContent?.trim();
        const matchedRecipe = recipes.find((recipe) => recipe.name === recipeName);
        if (matchedRecipe) {
            displayRecipe(matchedRecipe);
        }
    });
});
const saveButton = document.querySelector(".save-recipe-button");
saveButton?.addEventListener("click", () => {
    if (selectedRecipe === null) {
        alert("Please select a recipe first.");
        return;
    }
    const savedRecipes = JSON.parse(localStorage.getItem("savedRecipes") ?? "[]");
    const alreadySaved = savedRecipes.some((recipe) => recipe.name === selectedRecipe?.name);
    if (alreadySaved) {
        alert("This recipe is already saved to your board.");
        return;
    }
    savedRecipes.push(selectedRecipe);
    localStorage.setItem("savedRecipes", JSON.stringify(savedRecipes));
    alert(`${selectedRecipe.name} was saved to your board!`);
});
export {};
