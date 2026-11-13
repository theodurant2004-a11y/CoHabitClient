// Expenses page - OWNER part (the rent and the bills)

// Same rule as the roomie part: this file only DISPLAYS.
// The API splits the amounts, groups the parts of a charge and checks every value.
// Here we only ask the API, we show the answer and we send what the owner typed.
// The small helpers (createElement, formatEuro, formatDate, showMessage, hideMessage) are in expenses-roomie.js

// The url of the API for the charges of the owner
const OWNER_EXPENSES_URL = API_BASE + "/expenses/owner";

// The API answers an error with {"message": "..."}
// We keep the code and the message so the page can show why the API refused
async function throwOwnerApiError(response) {
    const body = await response.json().catch(() => ({}));   // no JSON in the answer: an empty object
    const error = new Error(`Response status: ${response.status}`);
    error.status = response.status;
    error.apiMessage = body.message;
    throw error;
}

// This function asks the API for everything the page shows (the roomies of the forms and the charges)
async function getOwnerExpenses() {
    // The API does not have a session system yet, so we send the email of the owner to say who is asking
    // TO DO : remove the email when the session system is efficient
    const response = await fetch(OWNER_EXPENSES_URL + "?email=" + encodeURIComponent(user.email), {
        credentials: "include"   // sends the cookie of the user
    });

    if (!response.ok) {
        await throwOwnerApiError(response);
    }

    return await response.json();
}

// This function sends a new rent or a new bill to the API
// The API splits it between the roomies, so we have nothing to calculate here
async function sendCharge(newCharge) {
    const response = await fetch(OWNER_EXPENSES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newCharge)
    });

    if (!response.ok) {
        await throwOwnerApiError(response);
    }
}

// This function asks the API to mark the part of one roomie as paid
async function sendOwnerSettle(partId) {
    const response = await fetch(
        OWNER_EXPENSES_URL + "/" + partId + "/settle?email=" + encodeURIComponent(user.email),
        { method: "PUT", credentials: "include" }
    );

    // 204 No Content = success, anything else is an error
    if (!response.ok) {
        await throwOwnerApiError(response);
    }
}

//-------------- Data kept by the page -----------------
// Everything the API answered: { members: [...], charges: [...] }. It is null until the API answered
let ownerExpensesData = null;

// The part waiting for the confirmation of the pop-up
let ownerPartToSettle = null;

//-------------- Small helpers -----------------
// The message shown when the API refused something
// 400 and 409 come from a rule of the model, so the message of the API explains what to change
function getOwnerErrorMessage(error, fallback) {
    const isRule = error.status === 400 || error.status === 409;
    return isRule && error.apiMessage ? error.apiMessage : fallback;
}

// A button cannot be clicked twice while the API is working
function setOwnerButtonBusy(buttonId, busy) {
    document.getElementById(buttonId).disabled = busy;
}

//-------------- Tabs -----------------
// Shows the panel of the clicked tab (Rent or Bills)
function showOwnerTab(event) {
    const clickedTab = event.currentTarget;

    document.querySelectorAll(".expenses-owner .tab").forEach(tab => {
        tab.classList.toggle("active", tab === clickedTab);
    });

    document.querySelectorAll(".expenses-owner .tab-panel").forEach(panel => {
        panel.hidden = panel.id !== "tab-" + clickedTab.dataset.tab;
    });

    // The button "+ Add a bill" only makes sense on the Bills tab
    document.getElementById("openBillModal").hidden = clickedTab.dataset.tab !== "bills";
}

//-------------- "People concerned" -----------------
// Creates one chip per roomie in a form (the rent form or the pop-up of the bills), all selected at the beginning
// containerId = where the chips go, countId = the number between the brackets
function showOwnerMembers(containerId, countId) {
    const container = document.getElementById(containerId);
    container.replaceChildren();

    if (ownerExpensesData.members.length === 0) {
        container.append(createElement("p", "form-sub", "No roomie in the roomshare yet."));
    }

    ownerExpensesData.members.forEach(member => {
        const chip = createElement("label", "chip");

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = member.id;
        checkbox.checked = true;
        checkbox.addEventListener("change", () => updateOwnerCount(containerId, countId));

        // The name is typed by a user: append adds it as text, never as HTML (XSS)
        chip.append(checkbox, member.name);
        container.append(chip);
    });

    updateOwnerCount(containerId, countId);
}

// Returns the ids of the roomies that are selected in a form
function getOwnerSelectedIds(containerId) {
    const checked = document.querySelectorAll("#" + containerId + " input:checked");
    return Array.from(checked).map(checkbox => Number(checkbox.value));
}

// Updates the number between the brackets
function updateOwnerCount(containerId, countId) {
    document.getElementById(countId).textContent = getOwnerSelectedIds(containerId).length;
}

//-------------- Show the charges -----------------
// This function creates the line of ONE roomie inside a charge: his name, his part and if he paid
function createPartRow(part) {
    const row = createElement("li", "charge-part");

    // The round circle with the first letter of the roomie
    row.append(createElement("span", "charge-avatar", part.debtor.charAt(0).toUpperCase()));
    row.append(createElement("span", "charge-part-name", part.debtor));
    row.append(createElement("strong", "charge-part-amount", formatEuro(part.amount)));

    if (part.settled) {
        row.append(createElement("span", "charge-status charge-status-paid", "Payment confirmed"));
    } else {
        row.append(createElement("span", "charge-status", "Pending"));

        // Only the owner (the person who is owed) can say that the roomie paid
        const button = createElement("button", "btn-confirm", "Mark as paid");
        button.type = "button";
        button.dataset.id = part.id;     // we keep the id in the button to find the part later
        row.append(button);
    }

    return row;
}

// This function creates the card of ONE charge (a rent or a bill) with the line of each roomie
function createChargeCard(charge) {
    const card = createElement("article", "charge-card");

    // The name and the due date on the left, the total on the right
    const head = createElement("div", "charge-head");
    const main = createElement("div", "expense-main");
    main.append(createElement("strong", "charge-title", charge.name));
    main.append(createElement("span", "expense-meta", "Due " + formatDate(charge.dueDate)));
    head.append(main, createElement("strong", "charge-total", formatEuro(charge.total)));

    const parts = createElement("ul", "charge-parts");
    charge.parts.forEach(part => parts.append(createPartRow(part)));

    card.append(head, parts);
    return card;
}

// This function shows the charges of one category in its list ("rent" in the Rent tab, "bills" in the Bills tab)
function showCharges(category, listId, emptyId) {
    const list = document.getElementById(listId);

    // We empty the list first, otherwise the cards would be added twice at each refresh
    list.replaceChildren();

    ownerExpensesData.charges.forEach(charge => {
        if (charge.category === category) {
            list.append(createChargeCard(charge));
        }
    });

    // The message "No ... published yet" is shown only when the list is empty
    document.getElementById(emptyId).hidden = list.children.length > 0;
}

//-------------- Rent form -----------------
// This function runs when the owner clicks on "Add the rent"
async function submitRent(event) {
    // A form reloads the page by default, we do not want that
    event.preventDefault();

    // We do not check the values here: the rules are in the API
    // A rent has no name: the API names it
    const rent = {
        category: "rent",
        amount: Number(document.getElementById("rentAmount").value),
        dueDate: document.getElementById("rentDueDate").value,
        recurrence: document.getElementById("rentRecurrence").value,
        roomieIds: getOwnerSelectedIds("rentMembers"),
        ownerEmail: user.email      // TODO : remove it when the session system is efficient
    };

    hideMessage("rentError");
    setOwnerButtonBusy("rentSubmit", true);

    try {
        await sendCharge(rent);

        // The form is ready for another rent: reset() also unchecks the chips, so we draw them again
        document.getElementById("rentForm").reset();

        // We ask the API again so the new rent appears with the part of each roomie already calculated
        await loadOwnerExpenses();
    } catch (e) {
        console.error(e.message);
        showMessage("rentError", getOwnerErrorMessage(e, "Unable to add the rent right now."));
    }

    setOwnerButtonBusy("rentSubmit", false);
}

//-------------- Pop-up "New bill" -----------------
// This function opens the pop-up
function openBillModal() {
    // We open it only if the API answered, because the roomies of the form come from it
    if (ownerExpensesData) {
        document.getElementById("billForm").reset();      // we clear what was typed last time
        showOwnerMembers("billMembers", "billCount");
        hideMessage("billError");                         // no old error message
        document.getElementById("billModal").hidden = false;
        document.getElementById("billName").focus();      // the cursor is ready in the first field
    }
}

// This function closes the pop-up
function closeBillModal() {
    document.getElementById("billModal").hidden = true;
}

// This function runs when the owner clicks on "Publish" in the pop-up
async function submitBill(event) {
    event.preventDefault();

    // The form of a bill has no recurrence: the API publishes it once
    const bill = {
        category: "bills",
        name: document.getElementById("billName").value.trim(),
        amount: Number(document.getElementById("billAmount").value),
        dueDate: document.getElementById("billDueDate").value,
        roomieIds: getOwnerSelectedIds("billMembers"),
        ownerEmail: user.email      // TODO : remove it when the session system is efficient
    };

    hideMessage("billError");
    setOwnerButtonBusy("billSubmit", true);

    try {
        await sendCharge(bill);
        closeBillModal();
        await loadOwnerExpenses();
    } catch (e) {
        console.error(e.message);
        showMessage("billError", getOwnerErrorMessage(e, "Unable to publish the bill right now."));
    }

    setOwnerButtonBusy("billSubmit", false);
}

//-------------- Confirm a payment -----------------
// This function looks for a part in the charges kept by the page
function findOwnerPart(partId) {
    let found = null;

    ownerExpensesData.charges.forEach(charge => {
        charge.parts.forEach(part => {
            if (part.id === partId) {
                found = part;
            }
        });
    });

    return found;
}

// This function fills and shows the confirmation pop-up for one part
function openOwnerSettleModal(partId) {
    const part = findOwnerPart(partId);

    if (part) {
        ownerPartToSettle = partId;
        document.getElementById("ownerSettleText").textContent =
            "Confirm that " + part.debtor + " paid you " + formatEuro(part.amount) +
            " for \"" + part.description + "\". This cannot be undone.";
        document.getElementById("ownerSettleModal").hidden = false;
    }
}

// This function hides the pop-up and forgets the chosen part
function closeOwnerSettleModal() {
    document.getElementById("ownerSettleModal").hidden = true;
    ownerPartToSettle = null;
}

// This function is called by the "Yes" button: it closes the pop-up, settles the part and reloads the lists
async function confirmOwnerSettle() {
    const partId = ownerPartToSettle;     // kept before closeOwnerSettleModal resets it
    closeOwnerSettleModal();

    if (partId !== null) {
        try {
            await sendOwnerSettle(partId);
            await loadOwnerExpenses();
        } catch (e) {
            console.error(e.message);
            showMessage("ownerExpensesMessage",
                getOwnerErrorMessage(e, "Unable to confirm the payment right now."));
        }
    }
}

//-------------- Start -----------------
// This function asks the API for the data and shows everything on the page
// It is used when the page opens and after each change (new rent, new bill, payment confirmed)
async function loadOwnerExpenses() {
    try {
        ownerExpensesData = await getOwnerExpenses();

        hideMessage("ownerExpensesMessage");     // if there was an error before, we remove it
        showOwnerMembers("rentMembers", "rentCount");
        showCharges("rent", "rentList", "rentEmpty");
        showCharges("bills", "billList", "billEmpty");
    } catch (e) {
        console.error(e.message);
        // The message is shown in the page (and not in an alert)
        showMessage("ownerExpensesMessage", "Unable to load the expenses right now.");
    }
}

// Events :
// app.js removes the block of the owner for a roomie (applyRole), so we start only when it exists
const expensesOwner = document.querySelector(".expenses-owner");

if (expensesOwner) {
    // We load the data as soon as the page opens
    loadOwnerExpenses();

    // We load the data again each time the owner comes back on the Expenses page
    window.addEventListener("hashchange", () => {
        if (window.location.hash === "#expenses") {
            loadOwnerExpenses();
        }
    });

    // The two tabs (Rent and Bills)
    expensesOwner.querySelectorAll(".tab").forEach(tab => {
        tab.addEventListener("click", showOwnerTab);
    });

    // The rent form
    document.getElementById("rentForm").addEventListener("submit", submitRent);

    // Buttons of the pop-up "New bill"
    document.getElementById("openBillModal").addEventListener("click", openBillModal);
    document.getElementById("cancelBill").addEventListener("click", closeBillModal);
    document.getElementById("billForm").addEventListener("submit", submitBill);

    // A click outside of the white box closes the pop-up
    // (event.target is the element clicked: if it is the dark background itself, we close)
    document.getElementById("billModal").addEventListener("click", event => {
        if (event.target.id === "billModal") {
            closeBillModal();
        }
    });

    // A click on "Mark as paid": the buttons are created later by createPartRow,
    // so we listen on the whole block and closest() finds the button that was clicked
    expensesOwner.addEventListener("click", event => {
        const button = event.target.closest(".btn-confirm");
        if (button) {
            openOwnerSettleModal(Number(button.dataset.id));
        }
    });

    // Buttons of the confirmation pop-up
    document.getElementById("confirmOwnerSettle").addEventListener("click", confirmOwnerSettle);
    document.getElementById("cancelOwnerSettle").addEventListener("click", closeOwnerSettleModal);
    document.getElementById("ownerSettleModal").addEventListener("click", event => {
        if (event.target.id === "ownerSettleModal") {
            closeOwnerSettleModal();
        }
    });
}
