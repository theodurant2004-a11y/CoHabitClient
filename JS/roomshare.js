const ROOMSHARE_API_URL = "http://localhost:8080/CoHabitAPI/api/roomshares";
const JOIN_API_URL = "http://localhost:8080/CoHabitAPI/api/join-requests";
const LOGOUT_API_URL = "http://localhost:8080/CoHabitAPI/api/users/logout";

const user = JSON.parse(sessionStorage.getItem("user"));

// Shows the section matching the role of the signed in user.
function showSection() {
    if (!user) {
        window.location.href = "SignIn.html";
        return;
    }

    if (user.role === "owner") {
        document.getElementById("ownerSection").hidden = false;
    } else if (user.role === "roomie") {
        document.getElementById("roomieSection").hidden = false;
    } else {
        window.location.href = "SignIn.html";
    }
}

// Signs the user out
async function signOut() {
    try {
        await fetch(LOGOUT_API_URL, {
            method: "POST",
            credentials: "include"
        });
    } catch (e) {
        console.error(e.message);
    }

    sessionStorage.removeItem("user");
    window.location.href = "SignIn.html";
}

// Sends a POST request with a JSON body and returns the response
function postJson(url, data) {
    return fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json"
        },
        body: JSON.stringify(data)
    });
}

// Returns true and signs the user out if the token is invalid or expired
function isSessionExpired(response) {
    if (response.status === 401) {
        alert("Your session has expired. Please sign in again.");
        signOut();
        return true;
    }

    return false;
}

// Owner :

// Checks the owner values and returns true if everything is valid
function checkOwnerInputs(name) {
    if (name.length < 3) {
        alert("The roomshare name must contain at least 3 characters.");
        return false;
    }

    return true;
}

// Reads the owner form, validates it, then creates the roomshare
async function createRoomshare(event) {
    event.preventDefault();

    const name = document.getElementById("roomshareName").value.trim();
    const address = document.getElementById("address").value.trim();

    if (!checkOwnerInputs(name)) {
        return;
    }

    try {

        // Be careful here, with the name of the keys
        // Because you must put the same name for the attributes of the DTO
        const response = await postJson(ROOMSHARE_API_URL, { name: name, owner: user});

        if (isSessionExpired(response)) {
            return;
        }

        if (response.status === 403) {
            alert("Only an owner can create a roomshare.");
            return;
        }

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        console.log("Roomshare created");
        const responseData = await response.json();
        sessionStorage.setItem("roomshare", JSON.stringify(responseData.roomshare));
        // window.location.href = "home.html";
    } catch (e) {
        console.error(e.message);
        alert("Unable to create the roomshare right now.");
    }
}

// Roomie :

// Checks the invitation key and returns true if it has 6 letters or digits
function checkRoomieInputs(invitationKey) {
    if (!/^[A-Z0-9]{6}$/.test(invitationKey)) {
        alert("The invitation key must contain exactly 6 letters or digits.");
        return false;
    }

    return true;
}

// Reads the roomie form and validates it. Then sends the join request
async function sendJoinRequest(event) {
    event.preventDefault();

    const invitationKey = document.getElementById("invitationKey").value.trim().toUpperCase();

    if (!checkRoomieInputs(invitationKey)) {
        return;
    }

    try {
        const response = await postJson(JOIN_API_URL, { invitationKey: invitationKey });

        if (isSessionExpired(response)) {
            return;
        }

        if (response.status === 404) {
            alert("Invalid invitation key.");
            return;
        }

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        console.log("Join request sent");
        alert("Request sent! Wait for the owner to accept it.");
    } catch (e) {
        console.error(e.message);
        alert("Unable to send the request right now.");
    }
}

// Events :

showSection();

document.getElementById("ownerForm").addEventListener("submit", createRoomshare);
document.getElementById("roomieForm").addEventListener("submit", sendJoinRequest);

document.getElementById("signOutOwner").addEventListener("click", signOut);
document.getElementById("signOutRoomie").addEventListener("click", signOut);