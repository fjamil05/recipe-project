
const profileMenuButton =
    document.querySelector<HTMLButtonElement>("#profile-menu-button");

const profileDropdown =
    document.querySelector<HTMLElement>("#profile-dropdown");

// Open and close the profile dropdown
profileMenuButton?.addEventListener("click", () => {

    if (!profileDropdown) {
        return;
    }

    profileDropdown.hidden = !profileDropdown.hidden;

    profileMenuButton.setAttribute(
        "aria-expanded",
        String(!profileDropdown.hidden)
    );
});

// Close the dropdown when clicking outside of it
document.addEventListener("click", (event) => {

    const target = event.target;

    if (!(target instanceof Node)) {
        return;
    }

    if (
        !profileMenuButton?.contains(target) &&
        !profileDropdown?.contains(target)
    ) {
        if (profileDropdown) {
            profileDropdown.hidden = true;
        }

        profileMenuButton?.setAttribute("aria-expanded", "false");
    }
});


// =========================================
// Edit Display Name
// =========================================

const editDisplayNameButton =
    document.querySelector<HTMLButtonElement>("#edit-display-name");

const profileDisplayName =
    document.querySelector<HTMLElement>("#profile-display-name");

const profileAvatar =
    document.querySelector<HTMLElement>("#profile-avatar");

const profileDropdownAvatar =
    document.querySelector<HTMLElement>("#profile-dropdown-avatar");

// Load the saved display name or use "User" by default
let displayName = localStorage.getItem("profileDisplayName") ?? "User";

// Update the name and avatar initials

function updateProfileDisplay(): void {

    if (profileDisplayName) {
        profileDisplayName.textContent = displayName;
    }

    const firstLetter = displayName.trim().charAt(0).toUpperCase() || "U";

    const savedPicture = localStorage.getItem("profilePicture");

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
        } else {
            avatar.textContent = firstLetter;
        }
    });

    // Show the remove button only when a picture exists
    const removeButton =
        document.querySelector<HTMLButtonElement>("#remove-profile-picture");

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
        alert("Display name cannot be empty.");
        return;
    }

    // Save the new display name
    displayName = trimmedName;

    localStorage.setItem("profileDisplayName", displayName);

    updateProfileDisplay();
});

// Display the saved name when the page loads
updateProfileDisplay();


// =========================================
// Profile Picture Upload and Removal
// =========================================

const changeProfilePictureButton =
    document.querySelector<HTMLButtonElement>("#change-profile-picture");

const removeProfilePictureButton =
    document.querySelector<HTMLButtonElement>("#remove-profile-picture");

const profilePictureInput =
    document.querySelector<HTMLInputElement>("#profile-picture-input");

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
        alert("Please select an image file.");
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

            context.drawImage(
                image,
                sourceX,
                sourceY,
                cropSize,
                cropSize,
                0,
                0,
                size,
                size
            );

            // Convert the resized image into a smaller JPEG
            const resizedPicture = canvas.toDataURL("image/jpeg", 0.8);

            try {
                localStorage.setItem("profilePicture", resizedPicture);

                updateProfileDisplay();

            } catch {
                alert("Unable to save the profile picture.");
            }
        };

        image.onerror = () => {
            alert("Unable to read the selected image.");
        };

        if (typeof reader.result === "string") {
            image.src = reader.result;
        }
    };

    reader.onerror = () => {
        alert("Unable to read the selected file.");
    };

    reader.readAsDataURL(file);

    // Allow selecting the same file again later
    profilePictureInput.value = "";
});

// Remove the saved profile picture
removeProfilePictureButton?.addEventListener("click", () => {

    localStorage.removeItem("profilePicture");

    updateProfileDisplay();
});


// =========================================
// Log Out
// =========================================

const logoutButton =
    document.querySelector<HTMLButtonElement>("#logout-button");

// Return to the Recipe Tracker welcome page
logoutButton?.addEventListener("click", () => {

    window.location.href = "index.html";

});


export {};
