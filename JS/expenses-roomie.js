// Expenses page - ROOMIE part

// This file only DISPLAYS the expenses of the roomie
// We do this because the logic must stay in the model :
// So in the front we never create data and we never add or divide money.
// We only ask the API, we show the answer and we send what the user typed.

// The url of the API for the expenses
const EXPENSES_URL = API_BASE + "/expenses";

// This function is used to ask the API for everything the page shows
// (summary, expenses, balances, refunds and members)
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

    // Same check here, we keep the code so the page knows if the API refused what was typed
    if (!response.ok) {
        const error = new Error(`Response status: ${response.status}`);
        error.status = response.status;
        throw error;
    }
}

// This function is used to ask the API for the categories of the form
async function getCategories() {
    const response = await fetch(EXPENSES_URL + "/categories", {
        credentials: "include"
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    return await response.json();
}

// This function asks the API to mark one expense as settled
// and just  the creditor is allowed to do it
async function sendSettle(expenseId) {
    const user = JSON.parse(sessionStorage.getItem("user"));

    const response = await fetch(
        EXPENSES_URL + "/" + expenseId + "/settle?email=" + encodeURIComponent(user.email),
        { method: "PUT", credentials: "include" }
    );

    // 204 No Content = success, anything else is an error
    if (!response.ok) {
        const error = new Error("Settle failed");
        error.status = response.status; // kept so the caller can show the right message
        throw error;
    }
}

//-------------- Data kept by the page -----------------
// Everything the API answered. We keep it because we need it later
// (for example to fill the pop-up or to change the filter without asking the API again)
// It is null until the API answered
let expensesData = null;

// The categories of the form: null until the API answered
let categories = null;

// The filter chosen by the user: "all", "pending" or "settled"
let currentFilter = "all";

// The text we show to the user for the status of an expense
const statusLabels = { pending: "Pending", settled: "Settled" };

// The icon of each category: SVG drawn with lines, like the icons of the sidebar
const categoryIcons = {
    food:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M3 4h2l2.6 10.6a2 2 0 0 0 2 1.4h7a2 2 0 0 0 2-1.5L20.5 8H6"/>' +
        '<circle cx="10" cy="20" r="1.4"/>' +
        '<circle cx="17" cy="20" r="1.4"/>' +
        '</svg>',
    rent:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M3 11 12 4l9 7"/>' +
        '<path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9"/>' +
        '<path d="M10 20v-5h4v5"/>' +
        '</svg>',
    bills:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.1 1 1.6h5c.1-.5.4-1.1 1-1.6A6 6 0 0 0 12 3z"/>' +
        '<path d="M9.5 18h5M10.5 21h3"/>' +
        '</svg>',
    household:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M9 8h5a2 2 0 0 1 2 2v10a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V10a2 2 0 0 1 2-2z"/>' +
        '<path d="M9.5 8V4h4v4"/>' +
        '<path d="M18 5h1.5M18 8.5h1.5M18 12h1.5"/>' +
        '</svg>',
    leisure:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<rect x="2" y="8" width="20" height="10" rx="4.5"/>' +
        '<path d="M7 11v4M5 13h4"/>' +
        '<circle cx="16.5" cy="12.5" r="0.6"/>' +
        '<circle cx="18.5" cy="15" r="0.6"/>' +
        '</svg>',
    other:
        '<svg viewBox="0 0 24 24" aria-hidden="true">' +
        '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/>' +
        '<path d="M3 7.5 12 12l9-4.5M12 12v9"/>' +
        '</svg>'
};

// The colors of the roomies
// so the roomie at position 0 always gets the first color, the next one the second .....
const roomieColors = ["#c17f2e", "#2e8b57", "#6a5acd", "#d1495b", "#00798c"];

// This function returns the icon of a category, or the icon of "other" if the code is unknown
function getCategoryIcon(code) {
    return categoryIcons[code] || categoryIcons.other;
}

// This function returns the color of the roomie at this position in the list
function getRoomieColor(index) {
    return roomieColors[index % roomieColors.length];
}

// The text we show to the user for the status of my balance
const balanceLabels = { creditor: "Creditor", debtor: "Debtor", balanced: "Balanced" };

// The color of the balance on the card "My balance" of the home page
// teal when the others owe me money, red when I owe money, no special color when everything is balanced
const balanceCardClasses = { creditor: "home-stat-creditor", debtor: "home-stat-debtor", balanced: "" };

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

// Same as above but the browser adds a "+" for a positive amount: 26 => "+26.00 €" and -19 => "-19.00 €"
function formatSignedEuro(amount) {
    return Number(amount).toLocaleString("en-GB", {
        signDisplay: "exceptZero",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }) + " €";
}

// Display format of a date: "2026-10-20" becomes "20 Oct 2026"
function formatDate(isoDate) {
    return new Date(isoDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// The status of an expense: "settled" or "pending"
function expenseStatus(expense) {
    return expense.settled ? "settled" : "pending";
}

// The status of a balance: "creditor", "debtor" or "balanced"
function balanceStatus(balance) {
    if (balance > 0) {
        return "creditor";
    }
    if (balance < 0) {
        return "debtor";
    }
    return "balanced";
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

    // The card "My balance" of the home page
    const status = balanceStatus(summary.balance);
    document.getElementById("homeBalance").textContent = formatSignedEuro(summary.balance);
    document.getElementById("homeBalanceNote").textContent = balanceLabels[status];
    document.getElementById("homeBalanceCard").className = "home-stat home-stat-balance " + balanceCardClasses[status];
}

// This function creates ONE line of the list of expenses
// It receives one expense (an object sent by the API) and returns the <li> ready to be added in the page
function createExpenseItem(expense) {
    const item = createElement("li", "expense-item");

    // the icon of the category
    const icon = createElement("span", "expense-icon");
    icon.innerHTML = getCategoryIcon(expense.category);

    // t he description and two  small lines (who paid and with who it is shared)
    const main = createElement("div", "expense-main");
    main.appendChild(createElement("strong", "expense-title", expense.description));
    main.appendChild(createElement("span", "expense-meta", expense.debtor + " owes " + expense.creditor + " · " + formatDate(expense.date)));

    // the amount of the debt and the status
    const side = createElement("div", "expense-side");
    side.appendChild(createElement("strong", "expense-amount", formatEuro(expense.amount)));
    // The css class of the badge depends on the status ("badge-pending" or "badge-settled")
    const status = expenseStatus(expense);
    side.appendChild(createElement("span", "badge badge-" + status, statusLabels[status]));

    item.append(icon, main, side);

    // Checkbox in front of the line : checked and locked when the expense is settled,
    // locked too when the connected person is not the creditor (only the creditor can settle).
    const isCreditor = expense.creditorId === expensesData.currentMemberId;
    const checkbox = createElement("input", "expense-check");
    checkbox.type = "checkbox";
    checkbox.checked = status === "settled";
    checkbox.disabled = status === "settled" || !isCreditor;
    checkbox.dataset.id = expense.id;
    checkbox.title = status === "settled"
        ? "Already paid"
        : (isCreditor ? "Mark as paid" : "Only the person who is owed can mark it as paid");
    item.prepend(checkbox);

    return item;
}

// This function shows the list of expenses, but only the ones that match the chosen filter
function showExpenses(expenses, filter) {
    const list = document.getElementById("expenseItems");

    // We empty the list first, otherwise the lines would be added twice at each refresh
    list.replaceChildren();

    // For each expens we show it if the filter is "all" or if its status is the one chosen
    expenses.forEach(expense => {
        if (filter === "all" || expenseStatus(expense) === filter) {
            list.appendChild(createExpenseItem(expense));
        }
    });

    // The message "No expense" is shown only when the list is empty
    document.getElementById("expensesEmpty").hidden = list.children.length > 0;
}

// This function creates ONE line of "Everyone's balance" (the name, the bar and the amount)
function createBalanceRow(balance, index) {
    // The css class of the bar and of the amount
    const sign = balance.amount < 0 ? "negative" : "positive";
    const row = createElement("li", "balance-row");

    // The round colored circle with the first letter of the name
    const dot = createElement("span", "member-dot", balance.name.charAt(0).toUpperCase());
    dot.style.backgroundColor = getRoomieColor(index);   // the color is chosen by the front from the position of the roomie

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
    balances.forEach((balance, index) => balanceList.appendChild(createBalanceRow(balance, index)));

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

    // We show the list again with the new filter bbut we already have the data, so no need to ask the API
    if (expensesData) {
        showExpenses(expensesData.expenses, currentFilter);
    }
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

// This function fills the list "Paid by" and the roomie buttons of the form
function fillForm(data) {
    const paidBy = document.getElementById("expensePaidBy");
    const split = document.getElementById("expenseSplit");

    // We empty everything first, otherwise the options would be added again each time the pop-up opens
    paidBy.replaceChildren();
    split.replaceChildren();

    data.members.forEach((member, index) => {
        // One option in the list "Paid by"
        paidBy.appendChild(new Option(member.name, member.id));

        // One button per roomie in "Split between", all selected at the beginning
        const chip = createElement("button", "chip-member selected", member.name);
        chip.type = "button";                    // so it does not submit the form
        chip.dataset.id = member.id;             // we keep the id in the button to find it later
        chip.style.backgroundColor = getRoomieColor(index);
        split.appendChild(chip);
    });

    // By default the user is the one who paid, the API tells us who the user is
    paidBy.value = data.currentMemberId;
    updateSplitCount();
}

// This function fills the list of categories of the form (one option per category, with its icon)
// We ask the API only once: if it fails, we try again the next time the pop-up opens
async function fillCategories() {
    const category = document.getElementById("expenseCategory");
    category.replaceChildren();

    try {
        if (!categories) {
            categories = await getCategories();
        }

        categories.forEach(item => {
            // An <option> can only show text, so the icon of the category is not used here
            category.appendChild(new Option(item.label, item.code));
        });
    } catch (e) {
        console.error(e.message);
        showMessage("expenseError", "Unable to load the categories right now.");
    }
}

// This function opens the pop-up
async function openModal() {
    // We open it only if the API answered, because the lists of the form come from it
    if (expensesData) {
        document.getElementById("expenseForm").reset();      // we clear what was typed last time
        fillForm(expensesData);

        // The date is today by default. "en-CA" is used because this language writes the dat
        document.getElementById("expenseDate").value = new Date().toLocaleDateString("en-CA");

        document.getElementById("expenseError").hidden = true;    // no old error message
        document.getElementById("expenseModal").hidden = false;   // the pop-up is now visible
        document.getElementById("expenseDescription").focus();    // the cursor is ready in the first field

        await fillCategories();
    }
}

// This function closes the pop-up
function closeModal() {
    document.getElementById("expenseModal").hidden = true;
}

// This function runs when the user clicks on "Add" in the pop-up
async function submitExpense(event) {
    // A form reloads the page by default, we do not want that so we use :
    event.preventDefault();

    // We read each value only once, we do not check them here: the rules are in the API
    const description = document.getElementById("expenseDescription").value.trim();
    const amount = Number(document.getElementById("expenseAmount").value);
    const date = document.getElementById("expenseDate").value;
    const paidById = Number(document.getElementById("expensePaidBy").value);
    const category = document.getElementById("expenseCategory").value;
    const sharedWithIds = getSelectedMemberIds();

    // No old error message
    hideMessage("expenseError");

    try {
        // roomieEmail tells the API who adds the expense (it is read from the body of the request)
        // TODO : remove it when the session system is efficient
        await sendExpense({ description, amount, date, paidById, category, sharedWithIds, roomieEmail: user.email });

        closeModal();

        // We ask the API again so the new expense appears and the totals come back already recalculated
        // We do not add the expense ourselves in the list, because we would have to calculate the new totals
        await loadExpenses();
    } catch (e) {
        console.error(e.message);
        // The code 400 means that the API refused what was typed
        const message = e.status === 400
            ? "Please check the fields: a description, an amount and at least one other roomie are required."
            : "Unable to add the expense right now.";
        showMessage("expenseError", message);
    }
}

//-------------- Settle an expense

// Expense waiting for the confirmation of the pop-up
let expenseToSettle = null;

// This function fills and shows the confirmation pop-up for one expense
function openSettleModal(expenseId) {
    const expense = expensesData.expenses.find(e => e.id === expenseId);
    if (!expense) return;

    expenseToSettle = expenseId;
    document.getElementById("settleText").textContent =
        "Confirm that " + expense.debtor + " paid you " + formatEuro(expense.amount) +
        " for \"" + expense.description + "\". This cannot be undone.";
    document.getElementById("settleModal").hidden = false;
}

// This function hides the pop-up and forgets the chosen expense
function closeSettleModal() {
    document.getElementById("settleModal").hidden = true;
    expenseToSettle = null;
}

// This function is called by the "Yes" button : it closes the pop-up then settles
async function confirmSettle() {
    const expenseId = expenseToSettle; // kept before closeSettleModal resets it
    closeSettleModal();
    if (expenseId === null) return;
    await settleExpense(expenseId);
}

// This function sends the settle request and then reloads the list
// Reloading refreshes the badges, the summary cards and the filter counters
async function settleExpense(expenseId) {
    try {
        hideMessage("expensesMessage");
        await sendSettle(expenseId);
        await loadExpenses();
    } catch (error) {
        console.error(error);
        showMessage(
            "expensesMessage",
            error.status === 403
                ? "Only the person who is owed can mark this expense as paid."
                : "Unable to mark the expense as paid right now."
        );
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

    // We load the data again each time the user comes back on the Expenses tab
    window.addEventListener("hashchange", () => {
        if (window.location.hash === "#expenses") {
            loadExpenses();
        }
    });

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

    // A click on a checkbox here we dont keep it checked the pop up asks first
    // If the user confirms the reload will check it for real
    document.getElementById("expenseItems").addEventListener("change", (event) => {
        const checkbox = event.target;
        if (!checkbox.classList.contains("expense-check")) return;
        if (checkbox.checked) {
            checkbox.checked = false;
            openSettleModal(Number(checkbox.dataset.id));
        }
    });

    document.getElementById("confirmSettle").addEventListener("click", confirmSettle);
    document.getElementById("cancelSettle").addEventListener("click", closeSettleModal);

    // A click outside the white box closes the pop-up
    document.getElementById("settleModal").addEventListener("click", (event) => {
        if (event.target.id === "settleModal") closeSettleModal();
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