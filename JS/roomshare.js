// URL of the API route that creates a roomshare
const ROOMSHARE_API_URL = "http://localhost:8080/CoHabitAPI/api/roomshares";
// URL of the API route that sends a request to join a roomshare
const JOIN_API_URL = "http://localhost:8080/CoHabitAPI/api/join-requests";

// The signed in user (getSignedInUser redirects to the sign in page if nobody is signed in)
const user = getSignedInUser();

// Shows the section matching the role of the signed in user
// It is only for display: the API checks the role itself
function showSection() {
    if (user) {
        if (user.role === "owner") {
            // Both sections are hidden in the HTML: only the matching one is shown
            document.getElementById("ownerSection").hidden = false;
        } else if (user.role === "roomie") {
            document.getElementById("roomieSection").hidden = false;
        } else {
            // If Unknown role: the stored data is not valid so sign in again
            window.location.href = "SignIn.html";
        }
    }
}

// Sends a POST request with a JSON body (and the session cookie) and returns the response
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

// Returns true (and signs the user out) if the session is invalid or expired
// The API answers 401 in that case
function isSessionExpired(response) {
    let expired = false;

    if (response.status === 401) {
        alert("Your session has expired. Please sign in again.");
        signOut();
        expired = true;
    }

    return expired;
}

// Owner :

// Checks the owner values and returns true if everything is valid
function checkOwnerInputs(name) {
    let valid = true;

    if (name.length < 3) {
        alert("The roomshare name must contain at least 3 characters.");
        valid = false;
    }
    return valid;
}

// Reads the owner form, validates it, then creates the roomshare
async function createRoomshare(event) {
    event.preventDefault();

    const name = document.getElementById("roomshareName").value.trim();

    if (checkOwnerInputs(name)) {
        try {
            const response = await postJson(ROOMSHARE_API_URL,  { name: name });

            if (!isSessionExpired(response)) {
                if (response.status === 403) {
                    // Forbidden: the user is not an owner
                    alert("Only an owner can create a roomshare.");
                } else if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                } else {
                    console.log("Roomshare created");
                    // window.location.href = "home.html";
                }
            }
        } catch (e) {
            console.error(e.message);
            alert("Unable to create the roomshare right now.");
        }
    }
}

// Roomie :

// Checks the invitation key and returns true if it has 6 letters or digits
function checkRoomieInputs(invitationKey) {
    let valid = true;
    if (!/^[A-Z0-9]{6}$/.test(invitationKey)) {
        alert("The invitation key must contain exactly 6 letters or digits.");
        valid = false;
    }
    return valid;
}

// Reads the roomie form and validates it. Then sends the join request to api
async function sendJoinRequest(event) {
    event.preventDefault();

    const invitationKey = document.getElementById("invitationKey").value.trim().toUpperCase();

    if (checkRoomieInputs(invitationKey)) {
        try {
            const response = await postJson(JOIN_API_URL, { invitationKey: invitationKey });

            if (!isSessionExpired(response)) {
                if (response.status === 404) {
                    // Not found: no roomshare uses this key
                    alert("Invalid invitation key.");
                } else if (!response.ok) {
                    throw new Error(`Response status: ${response.status}`);
                } else {
                    console.log("Join request sent");
                    alert("Request sent! Wait for the owner to accept it.");
                }
            }
        } catch (e) {
            console.error(e.message);
            alert("Unable to send the request right now.");
        }
    }
}

// Events :

showSection();

document.getElementById("ownerForm").addEventListener("submit", createRoomshare);
document.getElementById("roomieForm").addEventListener("submit", sendJoinRequest);

document.getElementById("signOutOwner").addEventListener("click", signOut);
document.getElementById("signOutRoomie").addEventListener("click", signOut);