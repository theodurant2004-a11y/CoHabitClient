// getSignedInUser redirects to the sign in page if nobody is signed in
const user = getSignedInUser();
// // // TODO: get it from the API (login or GET /roomshares/me) when it is available
const roomshare = JSON.parse(sessionStorage.getItem("roomshare"));

// No roomshare => redirect roomshare page
if (user && !roomshare) {
    window.location.href = "roomshare.html";
}

//-------------- function -----------------

// Shows view 
function showView() {
    let view = window.location.hash.slice(1) || "home";

    // Unknown view => go back to home
    if (!document.getElementById("view-" + view)) {
        view = "home";
    }

    // Hides every section 
    document.querySelectorAll(".view").forEach(section => {
        section.hidden = section.id !== "view-" + view;
    });

    // Highlights the matching link in the menu
    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.toggle("active", link.dataset.view === view);
    });
}

// Removes what the signed in user must not see
function applyRole() {
    document.querySelectorAll("[data-role]").forEach(element => {
        if (element.dataset.role !== user.role) {
            element.remove();
        }
    });
}

// Shows the roomshare name and invitation key
function showRoomshare() {
    if (roomshare) {
        document.getElementById("roomshareName").textContent = roomshare.name;

        // The invite block is removed for a roomie
        const keyElement = document.getElementById("invitationKey");
        if (keyElement) {
            keyElement.textContent = roomshare.invitationKey;
        }
    }
}

// Shows user information in the sidebar
function showUser() {
    if (user) {
        const initials = (user.firstName[0] + user.lastName[0]).toUpperCase();
        document.getElementById("userInitials").textContent = initials;
        document.getElementById("userName").textContent = user.firstName + " " + user.lastName;
        document.getElementById("userRole").textContent = user.role === "owner" ? "Owner" : "Roomie";
    }
}

// Copies the invitation key and shows a green icon for 1.5 seconds
async function copyKey() {
    const button = document.getElementById("copyKey");
    try {
        await navigator.clipboard.writeText(roomshare.invitationKey);
        button.classList.add("copied");
        setTimeout(() => button.classList.remove("copied"), 1500);
    } catch (e) {
        console.error(e.message);
    }
}
// ================== Rent formular gestions ====================
// error message
function showRentError(message) {
    const error = document.getElementById("rentError");
    error.textContent = message;
    error.hidden = message === "";
}

// Checks the rent values 
function checkRentInputs(amount, dueDate, roomieIds) {
    let message = "";

    if (!(amount > 0)) {
        message = "The rent must be greater than 0.";
    } else if (dueDate === "") {
        message = "Please choose the first due date.";
    } else if (roomieIds.length === 0) {
        message = "Please select at least one person.";
    }

    return message;
}

// Reads the rent form
function addRent(event) {
    event.preventDefault();

    const amount = Number(document.getElementById("rentAmount").value);
    const dueDate = document.getElementById("rentDay").value; 
    const frequency = document.getElementById("rentFrequency").value;
    const roomieIds = getSelectedRoomies();

    const message = checkRentInputs(amount, dueDate, roomieIds);
    showRentError(message);

    if (message === "") {
        const rent = {
            amount: amount,
            dueDate: dueDate,
            frequency: frequency,
            roomieIds: roomieIds
        };

        // TODO: POST /api/expenses when the API route exists
        console.log("Rent to send:", rent);
    }
}

// Events :
applyRole();
showUser();
showRoomshare();
showView();

window.addEventListener("hashchange", showView);
document.getElementById("signOut").addEventListener("click", signOut);

// copy button
const copyButton = document.getElementById("copyKey");
if (copyButton) {
    copyButton.addEventListener("click", copyKey);
}

// Rent form
const rentForm = document.getElementById("rentForm");
if (rentForm) {
    rentForm.addEventListener("submit", addRent);
}