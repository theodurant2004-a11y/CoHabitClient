const form = document.getElementById("signinForm");
const API_URL = "http://localhost:8080/CoHabitAPI/api/users/login";

// Function to checks the form fields
function checkInputs(email, passworld) {

    if (!email.includes("@")) {
        alert("Please enter a valid email address (must contain @).");
        return false;
    }

    if (password.length === 0) {
        alert("Please enter your password.");
        return false;
    }
    return true;
}

async function signIn(event) {
    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    if(!checkInputs(email, password)){
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ email: email, password: password })
        });

        if (response.status === 401) {
            alert("Incorrect email or password.");
            return;
        }

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const user = await response.json();
        sessionStorage.setItem("user", JSON.stringify(user));

        console.log("User logged in");
        // window.location.href = "home.html";
    } catch (e) {
        console.error(e.message);
        alert("Unable to sign in right now.");
    }
}

form.addEventListener("submit", signIn);