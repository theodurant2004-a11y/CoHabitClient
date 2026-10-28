// Expenses page - ROOMIE part

// This file only DISPLAYS the expenses of the roomie
// We do this because the logic must stay in the model :
// So in the front we never create data and we never add, divide or compare money.
// We only ask the API, we show the answer and we send what the user typed.

// The url of the API for the expenses
const EXPENSES_URL = "http://localhost:8080/CoHabitAPI/api/expenses";

// This function is used to ask the API for everything the page shows
// (summary, expenses, balances, refunds, members and categories)
async function getExpensesData() {
    // The API does not have a session system yet, so we send the email of the user to say who is asking
    // encodeURIComponent protects the special characters of the email (like @ or +) inside the url
    // TO DO : remove the email when the session system is efficient
    const response = await fetch(EXPENSES_URL + "?email=" + encodeURIComponent(user.email), {
        credentials: "include"   // sends the cookie of the user
    });

    // If the API did not answer with a 2xx code, we stop and the caller shows an error message
    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    // The answer is a JSON, we transform it into a JS object
    return await response.json();
}

// This function is used to send the new expense to the API
// The API saves it and calculates everything again, so we have nothing to calculate here
async function sendExpense(newExpense) {
    const response = await fetch(EXPENSES_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },   // we tell the API that we send a JSON
        credentials: "include",                            // same as above: the cookie
        body: JSON.stringify(newExpense)                   // the object is transformed into text
    });

    // Same check here
    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }
}

//-------------- Data kept by the page -----------------
// Everything the API answered. We keep it because we need it later
// (for example to fill the pop-up or to change the filter without asking the API again)
// It is null until the API answered
let expensesData = null;

// The filter chosen by the user: "all", "pending" or "settled"
let currentFilter = "all";

// The API sends the status in lowercase ("pending"), here is the text we show to the user
const statusLabels = { pending: "Pending", settled: "Settled" };

//-------------- Small helpers -----------------
// This function is used to create an HTML element in one line
// (tag = the type of element, className = its css class, text = what is written inside)
function createElement(tag, className, text) {
    const element = document.createElement(tag);

    // The class and the text are optional
    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

// Shows an error message inside the page
// elementId = the id of the paragraph in the html, text = the message
function showMessage(elementId, text) {
    const element = document.getElementById(elementId);
    element.textContent = text;
    element.hidden = false;       // the paragraph is hidden by default in the html
}

// Hides a message
function hideMessage(elementId) {
    document.getElementById(elementId).hidden = true;
}

// This function is only a display format: 45 becomes "45.00 €"
function formatEuro(amount) {
    return Number(amount).toFixed(2) + " €";
}

// Same as above but we add a "+" for a positive amount: 26 => "+26.00 €" and -19 => "-19.00 €"
// For a negative amount the "-" is already there
function formatSignedEuro(amount) {
    const sign = amount > 0 ? "+" : "";
    return sign + formatEuro(amount);
}

// Display format of a date: "2026-10-20" becomes "20 Oct 2026"
function formatDate(isoDate) {
    return new Date(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

//-------------- Show the data -----------------
// This function shows the summary line and the two cards (you owe / you are owed)
// The amounts come from the API (summary.toPay and summary.toReceive)
function showSummary(summary) {
    document.getElementById("expensesSummary").textContent =
        formatEuro(summary.toPay) + " to pay · " + formatEuro(summary.toReceive) + " to receive";
    document.getElementById("amountOwe").textContent = formatEuro(summary.toPay);
    document.getElementById("amountOwed").textContent = formatEuro(summary.toReceive);

    // The small text under the amount changes when there is nothing to pay / to receive
    document.getElementById("noteOwe").textContent = summary.toPay > 0 ? "Payments to make" : "No payment to make";
    document.getElementById("noteOwed").textContent = summary.toReceive > 0 ? "Refunds expected" : "No refund pending";
}

// This function creates ONE line of the list of expenses
// It receives one expense (an object sent by the API) and returns the <li> ready to be added in the page
function createExpenseItem(expense) {
    const item = createElement("li", "expense-item");

    // the icon of the category given by the API
    const icon = createElement("span", "expense-icon", expense.icon);

    // t he description and two  small lines (who paid and with who it is shared)
    const main = createElement("div", "expense-main");
    main.appendChild(createElement("strong", "expense-title", expense.description));
    main.appendChild(createElement("span", "expense-meta", expense.debtor + " owes " + expense.creditor + " · " + formatDate(expense.date)));

    // the amount of the debt and the status
    const side = createElement("div", "expense-side");
    side.appendChild(createElement("strong", "expense-amount", formatEuro(expense.amount)));
    // The css class of the badge depends on the status ("badge-pending" or "badge-settled")
    side.appendChild(createElement("span", "badge badge-" + expense.status, statusLabels[expense.status]));

    item.append(icon, main, side);
    return item;
}

// This function shows the list of expenses, but only the ones that match the chosen filter
function showExpenses(expenses, filter) {
    const list = document.getElementById("expenseItems");

    // We empty the list first, otherwise the lines would be added twice at each refresh
    list.replaceChildren();

    // For each expens we show it if the filter is "all" or if its status is the one chosen
    expenses.forEach(expense => {
        if (filter === "all" || expense.status === filter) {
            list.appendChild(createExpenseItem(expense));
        }
    });

    // The message "No expense" is shown only when the list is empty
    document.getElementById("expensesEmpty").hidden = list.children.length > 0;
}

// This function creates ONE line of "Everyone's balance" (the name, the bar and the amount)
function createBalanceRow(balance) {
    // A negative balance is shown in red, a positive one in green
    const sign = balance.amount < 0 ? "negative" : "positive";
    const row = createElement("li", "balance-row");

    // The round colored circle with the first letter of the name
    const dot = createElement("span", "member-dot", balance.name.charAt(0).toUpperCase());
    dot.style.backgroundColor = balance.color;       // the color comes from the API

    // The name and the bar under it
    // The width of the bar (percent) is given by the API, so the front does not calculate it
    const body = createElement("div", "balance-body");
    body.appendChild(createElement("span", "balance-name", balance.name));
    const bar = createElement("div", "balance-bar");
    const fill = createElement("div", "balance-fill " + sign);
    fill.style.width = balance.percent + "%";
    bar.appendChild(fill);
    body.appendChild(bar);

    // The amount on the right
    const amount = createElement("span", "balance-amount " + sign, formatSignedEuro(balance.amount));

    row.append(dot, body, amount);
    return row;
}

// This function creates one line of "Suggested refunds" (for example "Nora pays Arnaud 19.00 €")
// The refunds are suggested by the API, we only show them
function createRefundRow(refund) {
    const row = createElement("li", "refund-row");
    row.appendChild(createElement("span", "", refund.from + " pays " + refund.to));
    row.appendChild(createElement("strong", "", formatEuro(refund.amount)));
    return row;
}

// This function shows the whole "Balances" tab (the balances and the suggested refunds)
function showBalances(balances, refunds) {
    // Balances: we empty the list then we add one line per roomie
    const balanceList = document.getElementById("balanceItems");
    balanceList.replaceChildren();
    balances.forEach(balance => balanceList.appendChild(createBalanceRow(balance)));

    // Refunds: same thing
    const refundList = document.getElementById("refundItems");
    refundList.replaceChildren();
    refunds.forEach(refund => refundList.appendChild(createRefundRow(refund)));

    // "Everything is balanced" is shown only when there is no refund to do
    document.getElementById("refundsEmpty").hidden = refundList.children.length > 0;
}

//-------------- Tabs and filters -----------------
// This function is used to show the tab "list" or the tab "balances"
// The two tabs are always in the html, we only hide the one we do not want to see
function changeTab(tab) {
    document.getElementById("expensesList").hidden = tab !== "list";
    document.getElementById("expensesBalances").hidden = tab !== "balances";

    // The button of the chosen tab gets the css class "active"
    document.querySelectorAll(".expenses-tab").forEach(button => {
        button.classList.toggle("active", button.dataset.tab === tab);
    });
}

// This function is used to change the filter of the list (all, pending or settled)
function changeFilter(filter) {
    // We remember the chosen filter, it will be used again when the list is reloaded
    currentFilter = filter;

    // Same as for the tabs: only the chosen button is highlighted
    document.querySelectorAll("#expensesList .chip").forEach(button => {
        button.classList.toggle("active", button.dataset.filter === filter);
    });

    // We show the list again with the new filter. We already have the data, so no need to ask the API
    showExpenses(expensesData.expenses, currentFilter);
}

//-------------- Pop-up "New expense" -----------------
// This function returns the ids of the roomies that are selected in "Split between"
// We need them to send to the API with whom the expense is shared
function getSelectedMemberIds() {
    const ids = [];
    document.querySelectorAll("#expenseSplit .chip-member.selected").forEach(chip => {
        // dataset.id is a text, so we transform it into a number
        ids.push(Number(chip.dataset.id));
    });
    return ids;
}

// This function writes the number of selected roomies in "Split between (n)"
function updateSplitCount() {
    document.getElementById("splitCount").textContent = getSelectedMemberIds().length;
}

// This function fills the two lists (paid by, category) and the roomie buttons of the form
// Everything comes from the API (the members and the categories)
function fillForm(data) {
    const paidBy = document.getElementById("expensePaidBy");
    const category = document.getElementById("expenseCategory");
    const split = document.getElementById("expenseSplit");

    // We empty everything first, otherwise the options would be added again each time the pop-up opens
    paidBy.replaceChildren();
    category.replaceChildren();
    split.replaceChildren();

    data.members.forEach(member => {
        // One option in the list "Paid by"
        paidBy.appendChild(new Option(member.name, member.id));

        // One button per roomie in "Split between", all selected at the beginning
        const chip = createElement("button", "chip-member selected", member.name);
        chip.type = "button";                    // so it does not submit the form
        chip.dataset.id = member.id;             // we keep the id in the button to find it later
        chip.style.backgroundColor = member.color;
        split.appendChild(chip);
    });

    // One option per category (with its icon)
    data.categories.forEach(item => {
        category.appendChild(new Option(item.icon + " " + item.label, item.code));
    });

    // By default the user is the one who paid, the API tells us who the user is
    paidBy.value = data.currentMemberId;
    updateSplitCount();
}

// This function opens the pop-up
function openModal() {
    // We open it only if the API answered, because the lists of the form come from it
    if (expensesData) {
        document.getElementById("expenseForm").reset();      // we clear what was typed last time
        fillForm(expensesData);

        // The date is today by default. "en-CA" is used because this language writes the dat
        document.getElementById("expenseDate").value = new Date().toLocaleDateString("en-CA");

        document.getElementById("expenseError").hidden = true;    // no old error message
        document.getElementById("expenseModal").hidden = false;   // the pop-up is now visible
        document.getElementById("expenseDescription").focus();    // the cursor is ready in the first field
    }
}

// This function closes the pop-up
function closeModal() {
    document.getElementById("expenseModal").hidden = true;
}

// This function checks the form
// It shows the error message if something is wrong and returns true only when everything is fine
// We check here only that the fields are filled: the real rules stay in the API
function checkInputs(description, amount, sharedWithIds) {
    let valid = true;
    let message = "";

    if (description === "") {
        valid = false;
        message = "The description is required.";
    } else if (!(amount > 0)) {
        // An empty field gives 0 with Number(), so it is refused too
        valid = false;
        message = "The amount must be greater than 0.";
    } else if (sharedWithIds.length === 0) {
        valid = false;
        message = "Choose at least one roomie to split with.";
    }

    // The paragraph is shown only when there is an error
    const error = document.getElementById("expenseError");
    error.textContent = message;
    error.hidden = valid;

    return valid;
}

// This function runs when the user clicks on "Add" in the pop-up
async function submitExpense(event) {
    // A form reloads the page by default, we do not want that so we use :
    event.preventDefault();

    // We read each value only once, then we pass them to the functions
    const description = document.getElementById("expenseDescription").value.trim();
    const amount = Number(document.getElementById("expenseAmount").value);
    const date = document.getElementById("expenseDate").value;
    const paidById = Number(document.getElementById("expensePaidBy").value);
    const category = document.getElementById("expenseCategory").value;
    const sharedWithIds = getSelectedMemberIds();

    if (checkInputs(description, amount, sharedWithIds)) {
        try {
            // roomieEmail tells the API who adds the expense (it is read from the body of the request)
            // TODO : remove it when the session system is efficient
            await sendExpense({ description, amount, date, paidById, category, sharedWithIds, roomieEmail: user.email });

            closeModal();

            // We ask the API again the new expense appears and the totals come back already recalculated
            // We do not add the expense ourselves in the list, because we would have to calculate the new totals
            await loadExpenses();
        } catch (e) {
            console.error(e.message);
            // The message is shown inside the pop-up
            showMessage("expenseError", "Unable to add the expense right now.");
        }
    }
}

//-------------- Start -----------------
// This function asks the API for the data and shows everything on the page
// It is used when the page opens and after the user added an expense
async function loadExpenses() {
    try {
        expensesData = await getExpensesData();

        hideMessage("expensesMessage");     // if there was an error before, we remove it
        showSummary(expensesData.summary);
        showExpenses(expensesData.expenses, currentFilter);
        showBalances(expensesData.balances, expensesData.refunds);
    } catch (e) {
        console.error(e.message);
        // The message is shown in the page (and not in an alert)
        showMessage("expensesMessage", "Unable to load the expenses right now.");
    }
}

// Events :
// app.js removes the block of the roomie for an owner (applyRole), so we start only when it exists.
// Without this check, the code below would crash for an owner because the buttons would not exist
const expensesRoomie = document.querySelector(".expenses-roomie");

if (expensesRoomie) {
    // We load the data as soon as the page opens
    loadExpenses();

    // Buttons of the pop-up
    document.getElementById("openExpenseModal").addEventListener("click", openModal);
    document.getElementById("cancelExpense").addEventListener("click", closeModal);
    document.getElementById("expenseForm").addEventListener("submit", submitExpense);

    // A click outside of the white box closes the pop-up
    // (event.target is the element clicked: if it is the dark background itself, we close)
    document.getElementById("expenseModal").addEventListener("click", event => {
        if (event.target.id === "expenseModal") {
            closeModal();
        }
    });

    // A click on a roomie button selects / unselects it
    // The buttons are created later by fillForm, so we listen on their parent (the container)
    // and closest() finds the button that was clicked
    document.getElementById("expenseSplit").addEventListener("click", event => {
        const chip = event.target.closest(".chip-member");
        if (chip) {
            chip.classList.toggle("selected");
            updateSplitCount();
        }
    });

    // The two tabs (List and Balances)
    document.querySelectorAll(".expenses-tab").forEach(button => {
        button.addEventListener("click", () => changeTab(button.dataset.tab));
    });

    // The three filters (All, Pending, Settled)
    document.querySelectorAll("#expensesList .chip").forEach(button => {
        button.addEventListener("click", () => changeFilter(button.dataset.filter));
    });
}