// This is the code shared by all the pages

// URL of the API route that ends the session :
const LOGOUT_API_URL = "http://localhost:8080/CoHabitAPI/api/users/logout";

// Returns the signed in user
// If nobody is signed in, redirects to the sign in page and returns null.
function getSignedInUser() {
    // sessionStorage only contains text, so the user is stored as JSON
    // getItem returns null when nothing is here
    const user = JSON.parse(sessionStorage.getItem("user"));

    if (!user) {
        // If nobody is signed in we do a locatation to the sign in page
        window.location.href = "SignIn.html";
    }

    return user;
}

// Signs the user out: asks the API to end the session, then clears the browser data.
// The browser is cleared even if the API cannot be reached => user always sign out
async function signOut() {
    try {
        // The session cookie is HttpOnly so we know that the JavaScript cannot read it
        // credentials "include" lets the browser send it to the API
        await fetch(LOGOUT_API_URL, {
            method: "POST",
            credentials: "include"
        });
    } catch (e) {
    // The API is unreachable
        console.error(e.message);
    }

    // Removes the public user data and goes back to the sign in page
    sessionStorage.removeItem("user");
    window.location.href = "SignIn.html";
}