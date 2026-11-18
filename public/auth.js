
"use strict";

const API_URL = "/api/auth";

// ======================================
// HELPER: DISPLAY MESSAGES
// ======================================

function showMessage(element, message, type) {
    if (!element) return;

    element.textContent = message;
    element.className = "message " + type;
}

// ======================================
// REGISTRATION
// ======================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const fullNameInput = document.getElementById("full_name");
        const emailInput = document.getElementById("registerEmail");
        const passwordInput = document.getElementById("registerPassword");
        const confirmPasswordInput = document.getElementById("confirmPassword");

        const message = document.getElementById("registerMessage");
        const button = document.getElementById("registerButton");

        if (!fullNameInput || !emailInput || !passwordInput ||
            !confirmPasswordInput || !message || !button) {
            console.error("Registration form is missing required HTML elements.");
            return;
        }

        const full_name = fullNameInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        showMessage(message, "", "");

        if (!full_name || !email || !password || !confirmPassword) {
            showMessage(message, "Please fill in all fields.", "error");
            return;
        }

        if (password.length < 8) {
            showMessage(message, "Password must contain at least 8 characters.", "error");
            return;
        }

        if (password !== confirmPassword) {
            showMessage(message, "Passwords do not match.", "error");
            return;
        }

        button.disabled = true;
        button.textContent = "Creating Account...";

        try {
            const response = await fetch(`${API_URL}/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    full_name,
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Registration failed.");
            }

            showMessage(
                message,
                data.message || "Account created successfully! You can now log in.",
                "success"
            );

            registerForm.reset();

            setTimeout(() => {
                window.location.href = "/login.html";
            }, 1800);

        } catch (error) {
            console.error("Registration error:", error);

            showMessage(
                message,
                error.message || "Unable to connect to the server.",
                "error"
            );

        } finally {
            button.disabled = false;
            button.textContent = "Create Account";
        }
    });
}

// ======================================
// LOGIN
// ======================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const emailInput = document.getElementById("loginEmail");
        const passwordInput = document.getElementById("loginPassword");

        const message = document.getElementById("loginMessage");
        const button = document.getElementById("loginButton");

        if (!emailInput || !passwordInput || !message || !button) {
            console.error("Login form is missing required HTML elements.");
            return;
        }

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        showMessage(message, "", "");

        if (!email || !password) {
            showMessage(message, "Enter your email and password.", "error");
            return;
        }

        button.disabled = true;
        button.textContent = "Logging In...";

        try {
            const response = await fetch(`${API_URL}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Login failed.");
            }

            if (!data.token || !data.student) {
                throw new Error("The server returned an incomplete login response.");
            }

            // SAVE LOGIN SESSION
            sessionStorage.setItem("studentToken", data.token);
            sessionStorage.setItem("student", JSON.stringify(data.student));

            showMessage(
                message,
                data.message || "Login successful!",
                "success"
            );

            // REDIRECT TO YOUR ACTUAL DASHBOARD
            window.location.href = "/dashbd.html";

        } catch (error) {
            console.error("Login error:", error);

            showMessage(
                message,
                error.message || "Unable to connect to the server.",
                "error"
            );

        } finally {
            button.disabled = false;
            button.textContent = "Login";
        }
    });
}
