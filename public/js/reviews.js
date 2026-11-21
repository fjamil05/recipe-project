// Reviews and comments
// Shows star ratings and comments on a recipe, and lets other users leave their own. Used on the Search page and on share links.
import { api, button, el, errorText, notify, ratingText } from "./ui.js";
function summaryLine(summary) {
    if (summary.averageStars === null) {
        return el("p", "No reviews yet.", "review-summary");
    }
    const line = el("p", undefined, "review-summary");
    line.append(el("strong", "Average Rating: "), `${ratingText(summary.averageStars)} (${summary.reviewCount} review${summary.reviewCount === 1 ? "" : "s"})`);
    return line;
}
function reviewList(reviews) {
    const list = el("ul", undefined, "review-list");
    reviews.forEach((review) => {
        const item = el("li", undefined, "review-item");
        const heading = el("p", undefined, "review-heading");
        heading.append(el("strong", review.isMine ? "You" : review.username), ` - ${ratingText(review.stars)}`, el("span", ` (${new Date(review.createdAt).toLocaleDateString()})`, "review-date"));
        item.appendChild(heading);
        if (review.comment) {
            item.appendChild(el("p", review.comment, "review-comment"));
        }
        list.appendChild(item);
    });
    return list;
}
function reviewForm(recipeId, mine, refresh) {
    const form = el("form", undefined, "review-form");
    const starsLabel = el("label", "Your rating");
    const starsSelect = el("select");
    starsSelect.required = true;
    starsSelect.id = `review-stars-${recipeId}`;
    starsLabel.htmlFor = starsSelect.id;
    const placeholder = el("option", "Select a rating");
    placeholder.value = "";
    starsSelect.appendChild(placeholder);
    for (let stars = 5; stars >= 1; stars--) {
        const option = el("option", `${stars}/5`);
        option.value = String(stars);
        starsSelect.appendChild(option);
    }
    const commentLabel = el("label", "Comment (optional)");
    const comment = el("textarea");
    comment.id = `review-comment-${recipeId}`;
    comment.maxLength = 1000;
    comment.rows = 3;
    comment.placeholder = "What did you think? Any tips?";
    commentLabel.htmlFor = comment.id;
    if (mine) {
        starsSelect.value = String(mine.stars);
        comment.value = mine.comment;
    }
    const submit = el("button", mine ? "Update Review" : "Post Review", "create-board-button");
    submit.type = "submit";
    const actions = el("div", undefined, "board-form-buttons");
    actions.appendChild(submit);
    if (mine) {
        actions.appendChild(button("Delete Review", "secondary-button", async () => {
            const result = await api("DELETE", `/api/recipes/${recipeId}/reviews`);
            if (!result.ok) {
                notify(errorText(result), "error");
                return;
            }
            notify("Review deleted.", "success");
            refresh();
        }));
    }
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        submit.disabled = true;
        const result = await api("POST", `/api/recipes/${recipeId}/reviews`, {
            stars: Number(starsSelect.value),
            comment: comment.value
        });
        submit.disabled = false;
        if (!result.ok) {
            notify(errorText(result), "error");
            return;
        }
        notify(mine ? "Review updated!" : "Thanks for the review!", "success");
        refresh();
    });
    form.append(starsLabel, starsSelect, commentLabel, comment, actions);
    return form;
}
// Fills `container` with the reviews for a recipe.
// Your own recipes show what others said; other people's recipes let you review them.
export async function renderReviews(container, recipe) {
    container.replaceChildren(el("h4", "Reviews"), el("p", "Loading reviews...", "review-summary"));
    const isOwn = !recipe.owner;
    const result = isOwn
        ? await api("GET", `/api/my-recipe-reviews?name=${encodeURIComponent(recipe.name)}`)
        : recipe.id !== undefined
            ? await api("GET", `/api/recipes/${recipe.id}/reviews`)
            : null;
    container.replaceChildren(el("h4", "Reviews"));
    if (!result || !result.ok) {
        container.appendChild(el("p", "Reviews couldn't be loaded.", "review-summary"));
        return;
    }
    const summary = result.data;
    container.appendChild(summaryLine(summary));
    if (summary.reviews.length > 0) {
        container.appendChild(reviewList(summary.reviews));
    }
    if (summary.canReview && recipe.id !== undefined) {
        const mine = summary.reviews.find((review) => review.isMine);
        const id = recipe.id;
        container.appendChild(reviewForm(id, mine, () => renderReviews(container, recipe)));
    }
}
