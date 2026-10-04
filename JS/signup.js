const API_URL = "http://localhost:8080/CoHabitAPI/api/users";

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
// Checks the values of step 1 and returns true if everything is valid
function checkStep1Inputs(fullname, email, password, confirmPassword) {
    if (fullname.length < 3) {
        alert("The name must contain at least 3 characters.");
        return false;
    }

    if (!email.includes("@")) {
        alert("Please enter a valid email address (must contain @).");
        return false;
    }

    if (password.length < 6) {
        alert("The password must contain at least 6 characters.");
        return false;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match.");
        return false;
    }

    return true;
}



const form = document.getElementById('signupForm');


// Reads step 1 and validates it. Then saves the data and shows step 2
function submitStep1(event) {
    event.preventDefault();

    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if(!checkStep1Inputs(fullname, email, password, confirmPassword)){
        return;
    }

    signupData.fullname = fullname;
    signupData.email = email;
    signupData.password = password;

    showStep("step2");
}



// Step 2 :

// Checks the value of step 2 and returns true if a role is selected
function checkStep2Inputs(role) {
    if (!role) {
        alert("Please select a role.");
        return false;
    }

    return true;
}

// Reads step 2 and validates it, then creates the account
async function submitStep2(event) {
    event.preventDefault();

    const selected = document.querySelector('input[name="role"]:checked');
    const role = selected ? selected.value : null;

    if (!checkStep2Inputs(role)) {
        return;
    }

    signupData.role = role;

    await sendSignUp(signupData);
}


// Sending to the API :

// Creates the account, signs the user in, then goes to step 3
async function sendSignUp(data) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (response.status === 409) {
            alert("This email is already used.");
            showStep("step1");
            return;
        }

        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        const user = await response.json();
        sessionStorage.setItem("user", JSON.stringify(user));

        console.log("Account created");
        window.location.href = "Roomshare.html";
    } catch (e) {
        console.error(e.message);
        alert("Unable to create the account right now.");
    }
}

// Events :

document.getElementById("step1Form").addEventListener("submit", submitStep1);
document.getElementById("step2Form").addEventListener("submit", submitStep2);

document.getElementById("backToStep1").addEventListener("click", function () {
    showStep("step1");
});