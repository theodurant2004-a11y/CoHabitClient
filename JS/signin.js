const form = document.getElementById("signinForm");
const API_URL = "http://localhost:8080/CoHabitAPI/api/users/login";

// Function to checks the form fields
function checkInputs(email, password) {
    // Stops the browser from reloading the page when the form is submitted
    let valid = true;

    if (!email.includes("@")) {
        alert("Please enter a valid email address (must contain @).");
        valid = false;
    } else if (password.length === 0) {
        // Only checks that the field is not empty: the API decides if the password is correct
        alert("Please enter your password.");
        valid = false;
    }
    return valid;
}

// Reads the form, validates it, then sends the credentials to the API
async function signIn(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if(checkInputs(email, password)){
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({ email: email, password: password })
            });

            if (response.status === 401) {
                // Unauthorized: wrong email or password, the same message for both
                alert("Incorrect email or password.");
            } else if (!response.ok) {
                // Any other error is handled by the catch block
                throw new Error(`Response status: ${response.status}`);
            } else {
                // Only public information is stored: the token is in an HttpOnly cookie
                const result = await response.json();
                sessionStorage.setItem("user", JSON.stringify(result.user));

                console.log("User logged in");
                // TODO: redirect to the right page (depends on the state of the user)
                // window.location.href = "home.html";
            }
        } catch (e) {
            console.error(e.message);
            alert("Unable to sign in right now.");
        }
    }
}

form.addEventListener("submit", signIn);