const form = document.querySelector(".auth-form");
const isSignup = document.getElementById("username") !== null;

const message = document.createElement("p");
form.after(message);

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));

    const res = await fetch(isSignup ? "/api/signup" : "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    if (res.ok) {
        window.location.href = "dashboard.html";
    } else {
        const body = await res.json().catch(() => ({}));
        message.textContent = body.error ?? "Something went wrong.";
    }
});