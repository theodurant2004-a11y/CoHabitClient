const API_URL = "http://localhost:8080/CoHabitAPI/api/users";

const MIN_PASSWORD_LENGTH = 8;

const steps = document.querySelectorAll(".step");

// Data of the sign up in memory only until the account is created
const signupData = {};

// Shows one page step and hides the others.
function showStep(id) {
    steps.forEach(function (step) {
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


// Reads step 1 and validates it. Then saves the data and shows step 2
function submitStep1(event) {
    event.preventDefault();

    const firstname = document.getElementById('firstname').value.trim();
    const lastname = document.getElementById('lastname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if(checkStep1Inputs(firstname, lastname, email, password, confirmPassword)){
        signupData.firstname = firstname;
        signupData.lastname = lastname;
        signupData.email = email;
        signupData.password = password;

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

    const selected = document.querySelector('input[name="role"]:checked');
    const role = selected ? selected.value : null;

    if (checkStep2Inputs(role)) {
        signupData.role = role;

        await sendSignUp(signupData, event.submitter);
    }
}


// Sending to the API :

// Creates the account, signs the user in, then goes to the roomshare page
async function sendSignUp(data, button) {
    button.disabled = true;
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (response.status === 409) {
            alert("This email is already used.");
            showStep("step1");
        } else if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }
        else {
            const result = await response.json();
            sessionStorage.setItem("user", JSON.stringify(result.user));

            console.log("Account created");
            window.location.href = "Roomshare.html";
        }
    } catch (e) {
        console.error(e.message);
        alert("Unable to create the account right now.");
    } finally {
        button.disabled = false;
    }
}

// Events :

document.getElementById("step1Form").addEventListener("submit", submitStep1);
document.getElementById("step2Form").addEventListener("submit", submitStep2);

document.getElementById("backToStep1").addEventListener("click", function () {
    showStep("step1");
});
