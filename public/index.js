
"use strict";

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
        navLinks.classList.toggle("show");

        menuToggle.textContent =
            navLinks.classList.contains("show") ? "✕" : "☰";
    });

    navLinks.querySelectorAll("a").forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("show");
            menuToggle.textContent = "☰";
        });
    });
}
