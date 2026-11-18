
document.addEventListener("DOMContentLoaded", () => {

    const token = sessionStorage.getItem("studentToken");

    // Protect the dashboard from users who are not logged in.
    if (!token) {
        window.location.href = "/login.html";
        return;
    }

    const userName = document.getElementById("userName");
    const userEmail = document.getElementById("userEmail");
    const welcomeName = document.getElementById("welcomeName");
    const profileInitials = document.getElementById("profileInitials");
    const topInitials = document.getElementById("topInitials");
    const dashboardMessage = document.getElementById("dashboardMessage");

    const favoriteCount = document.getElementById("favoriteCount");
    const vehicleCount = document.getElementById("vehicleCount");
    const accountStatus = document.getElementById("accountStatus");

    const accountName = document.getElementById("accountName");
    const accountEmail = document.getElementById("accountEmail");
    const accountCreated = document.getElementById("accountCreated");

    const carSearch = document.getElementById("carSearch");
    const carGrid = document.getElementById("carGrid");
    const emptyMessage = document.getElementById("emptyMessage");
    const favoritesList = document.getElementById("favoritesList");

    let currentStudent = null;

    // Create initials from the student's full name.
    function getInitials(name) {
        return name
            .trim()
            .split(/\s+/)
            .slice(0, 2)
            .map(word => word.charAt(0).toUpperCase())
            .join("") || "ST";
    }

    // Display student information.
    function displayStudent(student) {

        const name = student.full_name || "Student";
        const email = student.email || "";

        userName.textContent = name;
        userEmail.textContent = email;
        welcomeName.textContent = name.split(" ")[0];

        accountName.textContent = name;
        accountEmail.textContent = email;

        const initials = getInitials(name);

        profileInitials.textContent = initials;
        topInitials.textContent = initials;

        accountStatus.textContent = "Active";

        if (student.created_at) {
            const date = new Date(student.created_at);

            accountCreated.textContent =
                "Member since: " +
                (Number.isNaN(date.getTime())
                    ? student.created_at
                    : date.toLocaleDateString());
        } else {
            accountCreated.textContent = "Member account";
        }
    }

    // Fetch the authenticated student from MySQL through Express.
    async function loadStudent() {

        try {
            const response = await fetch("/api/auth/me", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.status === 401 || response.status === 403) {
                sessionStorage.removeItem("studentToken");
                sessionStorage.removeItem("student");
                window.location.href = "/login.html";
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Unable to load student account.");
            }

            // Supports common API response formats.
            const student =
                data.student ||
                data.user ||
                data;

            if (!student.full_name || !student.email) {
                throw new Error("Student information was not returned by the server.");
            }

            currentStudent = student;

            displayStudent(student);

            // Keep the latest profile in session storage.
            sessionStorage.setItem("student", JSON.stringify(student));

            dashboardMessage.textContent = "";

        } catch (error) {

            console.error("Dashboard profile error:", error);

            // Use previously saved profile information if the server
            // temporarily cannot be reached.
            const savedStudent = sessionStorage.getItem("student");

            if (savedStudent) {
                try {
                    const student = JSON.parse(savedStudent);

                    if (student.full_name && student.email) {
                        currentStudent = student;
                        displayStudent(student);

                        dashboardMessage.textContent =
                            "Showing saved account details. Database connection is unavailable.";
                        return;
                    }
                } catch (parseError) {
                    console.error("Saved profile error:", parseError);
                }
            }

            dashboardMessage.textContent =
                "Could not load your account. Please refresh or log in again.";
        }
    }

    // Store favourites separately for each student.
    function getFavoriteKey() {
        const identifier = currentStudent?.email || "guest";
        return `velocityFavorites_${identifier.toLowerCase()}`;
    }

    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem(getFavoriteKey())) || [];
        } catch {
            return [];
        }
    }

    function saveFavorites(favorites) {
        localStorage.setItem(getFavoriteKey(), JSON.stringify(favorites));
        updateFavorites();
    }

    function updateFavorites() {

        const favorites = getFavorites();

        favoriteCount.textContent = favorites.length;

        document.querySelectorAll(".favorite-btn").forEach(button => {

            const car = button.dataset.car;
            const isFavorite = favorites.includes(car);

            button.textContent = isFavorite ? "♥" : "♡";
            button.classList.toggle("is-favorite", isFavorite);
            button.setAttribute(
                "aria-pressed",
                String(isFavorite)
            );
        });

        if (!favorites.length) {
            favoritesList.innerHTML = `
                <div class="activity-icon">♡</div>
                <div>
                    <h4>No favourites yet</h4>
                    <p>Click the heart on a vehicle to save it here.</p>
                </div>
            `;
            return;
        }

        favoritesList.innerHTML = `
            <div>
                <h4>Your saved vehicles</h4>
                <p>${favorites.map(car => escapeHTML(car)).join(", ")}</p>
            </div>
        `;
    }

    // Prevent saved car names from being interpreted as HTML.
    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]);
    }

    // Add or remove a vehicle from favourites.
    document.querySelectorAll(".favorite-btn").forEach(button => {

        button.addEventListener("click", () => {

            if (!currentStudent) {
                dashboardMessage.textContent =
                    "Your account is still loading. Please try again.";
                return;
            }

            const car = button.dataset.car;
            let favorites = getFavorites();

            if (favorites.includes(car)) {
                favorites = favorites.filter(item => item !== car);
            } else {
                favorites.push(car);
            }

            saveFavorites(favorites);
        });
    });

    // Search featured vehicles.
    carSearch.addEventListener("input", () => {

        const searchTerm = carSearch.value.toLowerCase().trim();
        let visibleCount = 0;

        document.querySelectorAll(".car-card").forEach(card => {

            const name = card.dataset.name.toLowerCase();
            const matches = name.includes(searchTerm);

            card.hidden = !matches;

            if (matches) {
                visibleCount++;
            }
        });

        emptyMessage.hidden = visibleCount !== 0;
    });

    // Mobile sidebar toggle.
    const menuBtn = document.getElementById("menuBtn");
    const sidebar = document.getElementById("sidebar");

    menuBtn.addEventListener("click", () => {
        sidebar.classList.toggle("active");
    });

    // Close sidebar after selecting a navigation link.
    document.querySelectorAll(".sidebar .nav-link").forEach(link => {
        link.addEventListener("click", () => {
            sidebar.classList.remove("active");
        });
    });

    // Logout.
    document.getElementById("logoutBtn").addEventListener("click", () => {

        sessionStorage.removeItem("studentToken");
        sessionStorage.removeItem("student");

        window.location.href = "/login.html";
    });

    // Count the featured vehicles.
    vehicleCount.textContent =
        document.querySelectorAll(".car-card").length;

    // Load the real student profile first.
    loadStudent().then(() => {
        if (currentStudent) {
            updateFavorites();
        }
    });

});
