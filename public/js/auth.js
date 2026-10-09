
const registerSection = document.getElementById("register-section");
const loginSection = document.getElementById("login-section");

const showRegisterBtn = document.getElementById("show-register-btn");
const showLoginBtn = document.getElementById("show-login-btn");

const registerUsername = document.getElementById("register-username");
const registerPassword = document.getElementById("register-password");
const registerBtn = document.getElementById("register-btn");

const loginUsername = document.getElementById("login-username");
const loginPassword = document.getElementById("login-password");
const loginBtn = document.getElementById("login-btn");

// Check whether user is already logged in
async function checkSession() {
    try {
        const response = await fetch("/api/auth/me");

        if (response.ok) {
            window.location.replace("/rooms.html");
        }
    } catch (error) {
        console.error("Session check failed:", error);
    }
}

// checkSession();

// Show Register
showRegisterBtn.addEventListener("click", () => {
    loginSection.style.display = "none";
    registerSection.style.display = "block";
});

// Show Login
showLoginBtn.addEventListener("click", () => {
    registerSection.style.display = "none";
    loginSection.style.display = "block";
});

// Register User
registerBtn.addEventListener("click", async () => {
    const username = registerUsername.value.trim();
    const password = registerPassword.value;

    if (!username || !password.trim()) {
        alert("Please enter username and password!");
        return;
    }

    try {
        registerBtn.disabled = true;

        const response = await fetch("/api/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        alert("Registration successful! Please login.");

        registerUsername.value = "";
        registerPassword.value = "";

        registerSection.style.display = "none";
        loginSection.style.display = "block";
    } catch (error) {
        console.error("Registration error:", error);
        alert("Something went wrong. Please try again.");
    } finally {
        registerBtn.disabled = false;
    }
});

// Login User
loginBtn.addEventListener("click", async () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value;

    if (!username || !password.trim()) {
        alert("Please enter username and password!");
        return;
    }

    try {
        loginBtn.disabled = true;

        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message);
            return;
        }

        // The server sets the HTTP-only JWT cookie.
        // Do not store the JWT in localStorage.
        window.location.replace("/rooms.html");

    } catch (error) {
        console.error("Login error:", error);
        alert("Something went wrong. Please try again.");
    } finally {
        loginBtn.disabled = false;
    }
});
