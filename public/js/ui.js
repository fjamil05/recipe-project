// Shared page helpers
// notify() - small message in the corner instead of alert() popups
// api() - calls the server and returns the JSON
// el() - creates an element with text and a class
// openDialog() - a simple pop-up panel (used for settings, collaborators, ...)
export function notify(message, kind = "info") {
    let area = document.querySelector("#toast-area");
    if (!area) {
        area = document.createElement("div");
        area.id = "toast-area";
        area.setAttribute("role", "status");
        area.setAttribute("aria-live", "polite");
        document.body.appendChild(area);
    }
    const toast = document.createElement("div");
    toast.className = `toast toast-${kind}`;
    const text = document.createElement("span");
    text.textContent = message;
    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "toast-close";
    closeButton.textContent = "×";
    closeButton.setAttribute("aria-label", "Dismiss message");
    closeButton.addEventListener("click", () => toast.remove());
    toast.append(text, closeButton);
    area.appendChild(toast);
    // Longer messages stay up a little longer
    window.setTimeout(() => toast.remove(), Math.max(4000, message.length * 70));
}
export async function api(method, path, body) {
    try {
        const response = await fetch(path, {
            method,
            ...(body === undefined
                ? {}
                : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
        });
        const data = await response.json().catch(() => ({}));
        return { ok: response.ok, status: response.status, data };
    }
    catch {
        return {
            ok: false,
            status: 0,
            data: { error: "Couldn't reach the server. Is it running?" }
        };
    }
}
// The error message from a failed api() call
export function errorText(result, fallback = "Something went wrong.") {
    return typeof result.data?.error === "string" ? result.data.error : fallback;
}
export function el(tag, text, className) {
    const element = document.createElement(tag);
    if (text !== undefined) {
        element.textContent = text;
    }
    if (className) {
        element.className = className;
    }
    return element;
}
export function button(text, className, onClick) {
    const element = el("button", text, className);
    element.type = "button";
    element.addEventListener("click", onClick);
    return element;
}
// Opens a pop-up panel. build() fills in the body; call close() to shut it.
export function openDialog(title, build) {
    // Same look as the "Add Recipe to Planner" panel
    const dialog = el("dialog", undefined, "app-dialog planner-recipe-form");
    const header = el("div", undefined, "app-dialog-header");
    const body = el("div", undefined, "app-dialog-body");
    const close = () => {
        dialog.close();
        dialog.remove();
    };
    const closeButton = button("×", "app-dialog-close", close);
    closeButton.setAttribute("aria-label", "Close");
    header.append(el("h2", title), closeButton);
    dialog.append(header, body);
    dialog.addEventListener("cancel", () => dialog.remove());
    document.body.appendChild(dialog);
    build(body, close);
    dialog.showModal();
}
// enjoyment rating format
export function ratingText(stars) {
    return `${Math.round(stars * 10) / 10}/5`;
}
