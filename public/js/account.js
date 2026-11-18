// =========================================
// Account settings (profile menu)
// =========================================
// Adds an "Account Settings" button to the profile dropdown with
// change password and delete account.
import { currentUsername } from "./store.js";
import { api, el, errorText, notify, openDialog } from "./ui.js";
function passwordField(labelText, id, autocomplete) {
    const label = el("label", labelText);
    const input = el("input");
    input.type = "password";
    input.id = id;
    input.required = true;
    input.autocomplete = autocomplete;
    label.htmlFor = id;
    return [label, input];
}
function changePasswordForm() {
    const form = el("form", undefined, "account-form");
    const [currentLabel, current] = passwordField("Current password", "current-password", "current-password");
    const [newLabel, newPassword] = passwordField("New password (8+ characters)", "new-password", "new-password");
    const [confirmLabel, confirm] = passwordField("Confirm new password", "confirm-password", "new-password");
    newPassword.minLength = 8;
    const submit = el("button", "Change Password", "create-board-button");
    submit.type = "submit";
    const buttons = el("div", undefined, "board-form-buttons");
    buttons.appendChild(submit);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (newPassword.value !== confirm.value) {
            notify("The new passwords don't match.", "error");
            return;
        }
        const result = await api("POST", "/api/account/password", {
            currentPassword: current.value,
            newPassword: newPassword.value
        });
        if (!result.ok) {
            notify(errorText(result), "error");
            return;
        }
        form.reset();
        notify("Password changed!", "success");
    });
    form.append(el("h3", "Change Password"), currentLabel, current, newLabel, newPassword, confirmLabel, confirm, buttons);
    return form;
}
function deleteAccountForm() {
    const form = el("form", undefined, "account-form danger-zone");
    const [label, password] = passwordField("Enter your password to confirm", "delete-password", "current-password");
    const submit = el("button", "Delete My Account", "secondary-button");
    submit.type = "submit";
    const buttons = el("div", undefined, "board-form-buttons");
    buttons.appendChild(submit);
    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const sure = confirm("This permanently deletes your account, recipes, boards, planner and reviews. This can't be undone. Continue?");
        if (!sure) {
            return;
        }
        const result = await api("POST", "/api/account/delete", { password: password.value });
        if (!result.ok) {
            notify(errorText(result), "error");
            return;
        }
        window.location.href = "index.html";
    });
    form.append(el("h3", "Delete Account"), el("p", "Deletes everything you've saved. Recipes you added to other people's boards are removed too."), label, password, buttons);
    return form;
}
function openAccountSettings() {
    openDialog("Account Settings", (body) => {
        if (currentUsername) {
            body.appendChild(el("p", `Signed in as ${currentUsername}`, "review-hint"));
        }
        body.append(changePasswordForm(), deleteAccountForm());
    });
}
// Put the button in the profile dropdown, just above Log Out
const dropdown = document.querySelector("#profile-dropdown");
const logoutButton = document.querySelector("#logout-button");
if (dropdown && logoutButton) {
    const settingsButton = el("button", "Account Settings");
    settingsButton.type = "button";
    settingsButton.id = "account-settings-button";
    settingsButton.addEventListener("click", () => {
        dropdown.hidden = true;
        openAccountSettings();
    });
    const separator = logoutButton.previousElementSibling;
    if (separator?.tagName === "HR") {
        separator.before(settingsButton);
    }
    else {
        logoutButton.before(settingsButton);
    }
}
