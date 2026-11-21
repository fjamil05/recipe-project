import { store, currentUsername } from "./store.js";
import { notify } from "./ui.js";
import "./account.js";
const profileMenuButton = document.querySelector("#profile-menu-button");
const profileDropdown = document.querySelector("#profile-dropdown");
// Open and close the profile dropdown
profileMenuButton?.addEventListener("click", () => {
    if (!profileDropdown) {
        return;
    }
    profileDropdown.hidden = !profileDropdown.hidden;
    profileMenuButton.setAttribute("aria-expanded", String(!profileDropdown.hidden));
});
// Close the dropdown when clicking outside of it
document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Node)) {
        return;
    }
    if (!profileMenuButton?.contains(target) &&
        !profileDropdown?.contains(target)) {
        if (profileDropdown) {
            profileDropdown.hidden = true;
        }
        profileMenuButton?.setAttribute("aria-expanded", "false");
    }
});
// Edit Display Name
const editDisplayNameButton = document.querySelector("#edit-display-name");
const profileDisplayName = document.querySelector("#profile-display-name");
const profileAvatar = document.querySelector("#profile-avatar");
const profileDropdownAvatar = document.querySelector("#profile-dropdown-avatar");
// Load the saved display name, or use the username by default
let displayName = store.getItem("profileDisplayName") || currentUsername || "User";
// Update the name and avatar initials
function updateProfileDisplay() {
    if (profileDisplayName) {
        profileDisplayName.textContent = displayName;
    }
    const firstLetter = displayName.trim().charAt(0).toUpperCase() || "U";
    const savedPicture = store.getItem("profilePicture");
    // Update both avatars
    [profileAvatar, profileDropdownAvatar].forEach((avatar) => {
        if (!avatar) {
            return;
        }
        avatar.replaceChildren();
        if (savedPicture) {
            const image = document.createElement("img");
            image.src = savedPicture;
            image.alt = "Profile picture";
            avatar.appendChild(image);
        }
        else {
            avatar.textContent = firstLetter;
        }
    });
    // Show the remove button only when a picture exists
    const removeButton = document.querySelector("#remove-profile-picture");
    if (removeButton) {
        removeButton.hidden = !savedPicture;
    }
}
// Allow the user to edit their display name
editDisplayNameButton?.addEventListener("click", () => {
    const newName = prompt("Enter your new display name:", displayName);
    // Cancel if the user closes the prompt
    if (newName === null) {
        return;
    }
    const trimmedName = newName.trim();
    // Prevent empty display names
    if (trimmedName.length === 0) {
        notify("Display name cannot be empty.");
        return;
    }
    // Save the new display name
    displayName = trimmedName;
    store.setItem("profileDisplayName", displayName);
    updateProfileDisplay();
});
// Display the saved name when the page loads
updateProfileDisplay();
// Profile Picture Upload and Removal
const changeProfilePictureButton = document.querySelector("#change-profile-picture");
const removeProfilePictureButton = document.querySelector("#remove-profile-picture");
const profilePictureInput = document.querySelector("#profile-picture-input");
// Open the file picker
changeProfilePictureButton?.addEventListener("click", () => {
    profilePictureInput?.click();
});
// Process the selected image
profilePictureInput?.addEventListener("change", () => {
    const file = profilePictureInput.files?.[0];
    if (!file) {
        return;
    }
    if (!file.type.startsWith("image/")) {
        notify("Please select an image file.");
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        const image = new Image();
        image.onload = () => {
            // Resize the image to fit a profile avatar
            const canvas = document.createElement("canvas");
            const size = 200;
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext("2d");
            if (!context) {
                return;
            }
            // Crop the image into a centered square
            const cropSize = Math.min(image.width, image.height);
            const sourceX = (image.width - cropSize) / 2;
            const sourceY = (image.height - cropSize) / 2;
            context.drawImage(image, sourceX, sourceY, cropSize, cropSize, 0, 0, size, size);
            // Convert the resized image into a smaller JPEG
            const resizedPicture = canvas.toDataURL("image/jpeg", 0.8);
            try {
                store.setItem("profilePicture", resizedPicture);
                updateProfileDisplay();
            }
            catch {
                notify("Unable to save the profile picture.");
            }
        };
        image.onerror = () => {
            notify("Unable to read the selected image.");
        };
        if (typeof reader.result === "string") {
            image.src = reader.result;
        }
    };
    reader.onerror = () => {
        notify("Unable to read the selected file.");
    };
    reader.readAsDataURL(file);
    // Allow selecting the same file again later
    profilePictureInput.value = "";
});
// Remove the saved profile picture
removeProfilePictureButton?.addEventListener("click", () => {
    store.removeItem("profilePicture");
    updateProfileDisplay();
});
// Log Out
const logoutButton = document.querySelector("#logout-button");
// Return to the Recipe Tracker welcome page
logoutButton?.addEventListener("click", async () => {
    // End the session on the server, then go back to the welcome page
    await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "index.html";
});
