// We have 2 steps on a single page: the first : personal information and the second : the role.
// The account is only created when step 2 is submitted.

// URL of the API route that creates an account
const API_URL = "http://localhost:8080/CoHabitAPI/api/users";

// Minimum number of characters of a password, the the API checks it too
const MIN_PASSWORD_LENGTH = 8;

// All the steps of the page (the <section class="step"> elements)
const steps = document.querySelectorAll(".step");

// Data of the sign up in memory only until the account is created
const signupData = {};

// Shows the step with the given id and hides the others one
function showStep(id) {
    steps.forEach(function (step) {
        // "hidden" is true for every step except the one we want to show
        step.hidden = step.id !== id;
    });
}

// step one of signup :

// Returns true if the password respect the rules
function isStrongPassword(password) {
    return /[A-Z]/.test(password)
        && /[a-z]/.test(password)
        && /[0-9]/.test(password)
        && /[^A-Za-z0-9]/.test(password);
}

// Checks the values of step 1 and returns true if everything is valid
function checkStep1Inputs(firstname, lastname, email, password, confirmPassword) {
    let valid = true;

    if (firstname.length < 2) {
        alert("The first name must contain at least 2 characters.");
        valid = false;
    }
    else if (lastname.length < 2) {
        alert("The last name must contain at least 2 characters.");
        valid = false;
    }else if (!email.includes("@")) {
        alert("Please enter a valid email address (must contain @).");
        valid = false;
    } else if (password.length < MIN_PASSWORD_LENGTH) {
        alert(`The password must contain at least ${MIN_PASSWORD_LENGTH} characters.`);
        valid = false;
    } else if (!isStrongPassword(password)) {
        alert("The password must contain an uppercase letter, a lowercase letter, a digit and a special character.");
        valid = false;
    } else if (password !== confirmPassword) {
        alert("Passwords do not match.");
        valid = false;
    }

    return valid;
}


// Reads step 1 and validates it. If everything is valid, saves the data and shows step 2
function submitStep1(event) {

    event.preventDefault();

    const firstname = document.getElementById('firstname').value.trim();
    const lastname = document.getElementById('lastname').value.trim();
    const email = document.getElementById('email').value.trim();
    // i dont trim the passworld because spaces can be part of a password
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if(checkStep1Inputs(firstname, lastname, email, password, confirmPassword)){
        signupData.firstname = firstname;
        signupData.lastname = lastname;
        signupData.email = email;
        signupData.password = password;
        signupData.confirmPassword = confirmPassword;

        showStep("step2");
    }

}

// Step 2 :

// Checks the value of step 2 and returns true if a role is selected
function checkStep2Inputs(role) {
    let valid = true;

    if (!role) {
        alert("Please select a role.");
        valid = false;
    }

    return valid;
}

// Reads step 2 and validates it, then creates the account
async function submitStep2(event) {
    event.preventDefault();

    // The checked radio button, or null if the user did not choose a role
    const selected = document.querySelector('input[name="role"]:checked');
    const role = selected ? selected.value : null;

    if (checkStep2Inputs(role)) {
        signupData.role = role;

        // event.submitter is the button that was clicked (it is disabled during the request)
        await sendSignUp(signupData, event.submitter);
    }
}


// Sending to the API :

// Sends the account to the API. Success => saves the user and goes to the roomshare page.
// The button is disabled during the request to avoid sending it twice.
async function sendSignUp(data, button) {
    button.disabled = true;
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            // Lets the browser accept and send the session cookie set by the API
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (response.status === 409) {
            alert("This email is already used.");
            // If an account already uses this email, so go back to step 1
            showStep("step1");
        } else if (!response.ok) {
            // Any other error (400, 500...) is handled by the catch block
            throw new Error(`Response status: ${response.status}`);
        }
        else {
            // Only public information is stored: the token is in an HttpOnly cookie
            const result = await response.json();
            sessionStorage.setItem("user", JSON.stringify(result.user));

            console.log("Account created");
            window.location.href = "Roomshare.html";
        }
    } catch (e) {
        // Network error, API unreachable or unexpected status
        console.error(e.message);
        alert("Unable to create the account right now.");
    } finally {
        // Runs in every case, so the button always becomes usable again
        button.disabled = false;
    }
}

// Events :

document.getElementById("step1Form").addEventListener("submit", submitStep1);
document.getElementById("step2Form").addEventListener("submit", submitStep2);

// The "Back" button of step 2 goes back to step 1 (the typed values are still in the fields)
document.getElementById("backToStep1").addEventListener("click", function () {
    showStep("step1");
});
