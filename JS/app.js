// getSignedInUser redirects to the sign in page if nobody is signed in
const user = getSignedInUser();
// TODO: get it from the API (login or GET /roomshares/me) when it is available
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

// Shows  of the sidebar
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
// Events :
applyRole();
showUser();
showRoomshare();
showView();

window.addEventListener("hashchange", showView);
document.getElementById("signOut").addEventListener("click", signOut);

const copyButton = document.getElementById("copyKey");
// copy button
if (copyButton) {
    copyButton.addEventListener("click", copyKey);
}