const ROOMSHARE_API_URL = "http://localhost:8080/CoHabitAPI/api/roomshares";
const JOIN_API_URL = "http://localhost:8080/CoHabitAPI/api/join-requests";
const LOGOUT_API_URL = "http://localhost:8080/CoHabitAPI/api/users/logout";

// The signed in user, saved by the sign in or sign up page
const user = JSON.parse(sessionStorage.getItem("user"));

// Shows the section matching the role of the signed in user.
// It is only for display: the API checks the role itself
function showSection() {
    if (!user) {
        // Nobody is signed in
        window.location.href = "SignIn.html";
    } else if (user.role === "owner") {
        document.getElementById("ownerSection").hidden = false;
    } else if (user.role === "roomie") {
        document.getElementById("roomieSection").hidden = false;
    } else {
        // Unknown role
        window.location.href = "SignIn.html";
    }
}

// Signs the user out: asks the API to end the session, then clears the browser data
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

// Returns true if no field of the address is filled in (the address is optional)
function isAddressEmpty(address) {
    return address.streetName === ""
        && address.streetNumber === ""
        && address.postalCode === ""
        && address.city === ""
        && address.country === "";
}

// Checks the owner values and returns true if everything is valid
function checkOwnerInputs(name, address) {
    let valid = true;

    if (name.length < 3) {
        alert("The roomshare name must contain at least 3 characters.");
        valid = false;
    } else if (!isAddressEmpty(address)) {
        if (address.streetName === "" || address.streetNumber === ""
            || address.postalCode === "" || address.city === "" || address.country === "") {
            alert("Please fill in the whole address, or leave it empty.");
            valid = false;
        } else if (!/^[A-Za-z0-9 -]{3,10}$/.test(address.postalCode)) {
            alert("Please enter a valid postal code.");
            valid = false;
        }
    }
    return valid;
}

// Reads the owner form, validates it, then creates the roomshare
async function createRoomshare(event) {
    event.preventDefault();

    const name = document.getElementById("roomshareName").value.trim();
    const address = {
        streetName: document.getElementById("streetName").value.trim(),
        streetNumber: document.getElementById("streetNumber").value.trim(),
        postalCode: document.getElementById("postalCode").value.trim(),
        city: document.getElementById("city").value.trim(),
        country: document.getElementById("country").value.trim()
    };

    if (checkOwnerInputs(name, address)) {
        // The address is optional : null is sent when nothing is filled in
        const body = { name: name, address: isAddressEmpty(address) ? null : address };
        try {
            const response = await postJson(ROOMSHARE_API_URL, body);

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