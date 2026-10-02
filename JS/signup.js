const form = document.getElementById('signupForm');

const API_URL = "http://localhost:8080/CoHabitAPI/api/users";

async function signUp(event) {
    event.preventDefault();

    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validation
    if (fullname.length < 3) {
        alert('The name must contain at least 3 characters !');
        return;
    }

    if (!email.includes('@')) {
        alert('Please enter a valid email address (must contain @)');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters long.');
        return;
    }

    if (password !== confirmPassword) {
        alert('Passwords do not match.');
        return;
    }


    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({ fullname: fullname, email: email, password: password })
        });

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        console.log("Account created");
        // window.location.href = "SignUp2.html";
    } catch (e) {
        console.error(e.message);
        alert("Unable to create the account right now.");
    }
};

form.addEventListener("submit", signUp);