// The general URL of the shopping-list part of the API
const SHOPPINGLIST_URL = "http://localhost:8080/CoHabitAPI/api/users/" + 421 + "/shopping-items";
const itemList = document.getElementById("sl-list-container");
const addItemForm = document.getElementById("addItemForm");
const validateForm = document.getElementById("validateForm");
const itemCount = document.getElementById("sl-item-count");
const emptyArea = document.getElementById("sl-empty");
const progressBarArea = document.getElementById("sl-progress-container");
const actionsBtns = document.getElementById("sl-actions");
const masterCheckbox = document.getElementById("slSelectAll");

async function loadItems() {
    const response = await fetch(SHOPPINGLIST_URL, {
        credentials: "include"
    });

    if (!response.ok) {
        throw new Error(getErrorMessage(response.status));
    }

    const data = await response.json();
    console.log(data);
    return data;
}

function updateProgressBar() {
    const total = itemList.querySelectorAll('.sl-checkbox').length;
    const checked = itemList.querySelectorAll('.sl-checkbox:checked').length;

    if (masterCheckbox) {
        masterCheckbox.checked = (total > 0 && checked === total);
    }

    document.getElementById("openValidateModal").hidden = checked == 0;
    const percent = total === 0 ? 0 : Math.round((checked / total) * 100);

    document.getElementById("sl-progress-count").innerText = `${checked}/${total} found`;
    document.getElementById("sl-progress-percent").innerText = `${percent}%`;
    document.getElementById("sl-progress-fill").style.width = `${percent}%`;
}

async function printItems() {
    try {
        const items = await loadItems();

        itemCount.innerText = items.length;
        emptyArea.hidden = items.length > 0;
        progressBarArea.hidden = items.length == 0;
        actionsBtns.hidden = items.length == 0;

        itemList.hidden = false;
        itemList.innerHTML = "";

        let ul = document.createElement("ul");
        ul.classList.add("sl-list");

        items.forEach((item) => {
            let li = document.createElement("li");
            li.classList.add("sl-item");
            li.id = item.productId;

            let inputCheck = document.createElement("input");
            inputCheck.type = "checkbox";
            inputCheck.checked = item.found;
            inputCheck.classList.add("sl-checkbox");

            let span = document.createElement("span");
            span.textContent = item.productName;
            span.classList.add("sl-item-name");

            let inputQty = document.createElement("input");
            inputQty.type = "text";
            inputQty.classList.add("sl-item-qty-input");
            inputQty.value = item.quantity;

            let button = document.createElement("button");
            button.textContent = "×";
            button.classList.add("sl-btn-delete");

            li.append(inputCheck, span, inputQty, button);

            ul.appendChild(li);
        });
        itemList.appendChild(ul);

        updateProgressBar();
    } catch (error) {
        console.error("Impossible to load the list:", error.message);
        showListError(error.message);
    }
}

async function submitNewItem(event) {
    event.preventDefault();

    const nameInput = document.getElementById("addItemName");
    const quantityInput = document.getElementById("addItemQty");
    const categoryInput = document.getElementById("addItemCategory");
    const errorText = document.getElementById("addItemError");

    const name = nameInput.value.trim();
    const quantity = quantityInput.value.trim();
    const category = categoryInput.value.trim();

    if (!name) {
        errorText.textContent = "The item name is required.";
        errorText.hidden = false;
        nameInput.focus();
        return;
    }

    if (name.length > 50) {
        errorText.textContent = "The item name must be less than 50 characters.";
        errorText.hidden = false;
        nameInput.focus();
        return;
    }

    try {
        await sendNewItem({ name, quantity, category });
        closeModal(document.getElementById("addItemModal"));
        await printItems();
    } catch (e) {
        errorText.textContent = e.message;
        errorText.hidden = false;
    }
}

async function sendNewItem(newItem) {
    const response = await fetch(SHOPPINGLIST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newItem)
    });

    if (!response.ok) {
        throw new Error(getErrorMessage(response.status));
    }
}

async function checkOrUncheckAll(event) {
    const isChecked = event.target.checked;
    const boxList = itemList.querySelectorAll('.sl-checkbox');

    boxList.forEach((box) => box.checked = isChecked );
    updateProgressBar();

    for (let box of boxList) {
        const itemLi = box.closest('.sl-item');
        const productId = itemLi.id;
        const quantity = itemLi.querySelector('.sl-item-qty-input').value;

        try {
            await sendChange(productId, { quantity, status: isChecked });
            updateProgressBar();
        } catch (error) {
            box.checked = !isChecked;
            console.error("Update error", error);
            showListError(error.message);
        }
    }
}

async function getChange(event) {
    if (event.target.classList.contains("sl-checkbox") || event.target.classList.contains("sl-item-qty-input")) {
        const itemLi = event.target.parentElement;
        const productId = itemLi.id;
        const quantity = itemLi.querySelector('.sl-item-qty-input').value;
        const isChecked = itemLi.querySelector('.sl-checkbox').checked;

        updateProgressBar();
        try {
            await sendChange(productId, { quantity, status: isChecked });
            updateProgressBar();
        } catch (error) {
            console.error("Update error", error);
            showListError(error.message);
            if (event.target.classList.contains("sl-checkbox"))
                event.target.checked = !isChecked;
        }
    }
}

async function sendChange(productId, change) {
    const response = await fetch(SHOPPINGLIST_URL + "/" + productId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(change)
    });

    if (!response.ok) {
        throw new Error(getErrorMessage(response.status));
    }
}

async function getItemToDelete(event) {
    if (event.target.classList.contains("sl-btn-delete")) {
        const itemList = event.target.parentElement;
        const productId = itemList.id;

        try {
            await sendItemToDelete(productId);
            await printItems();
        } catch (error) {
            console.error("Deletion error", error);
            showListError(error.message);
        }
    }
}

async function sendItemToDelete(productId) {
    const response = await fetch(SHOPPINGLIST_URL + "/" + productId, {
        method: "DELETE",
        credentials: "include"
    });

    if (!response.ok) {
        throw new Error(getErrorMessage(response.status));
    }
}

async function submitValidation(event) {
    event.preventDefault();

    const descriptionInput = document.getElementById("valDescription");
    const amountInput = document.getElementById("valAmount");
    const errorText = document.getElementById("validateError");

    const description = descriptionInput.value.trim();
    const amountStr = amountInput.value.trim();
    const amount = parseFloat(amountStr);

    if (!description) {
        errorText.textContent = "Please provide a description.";
        errorText.hidden = false;
        descriptionInput.focus();
        return;
    }

    if (!amountStr || isNaN(amount) || amount <= 0) {
        errorText.textContent = "Please enter a valid amount greater than 0.";
        errorText.hidden = false;
        amountInput.focus();
        return;
    }

    try {
        await sendValidation({ description, amount });
        closeModal(document.getElementById("validateModal"));
        await printItems();
    } catch (e) {
        errorText.textContent = e.message;
        errorText.hidden = false;
    }
}

async function sendValidation(validation) {
    const response = await fetch(SHOPPINGLIST_URL + "/confirm-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validation)
    });

    if (!response.ok) {
        throw new Error(getErrorMessage(response.status));
    }
}

function getErrorMessage(status) {
    switch (status) {
        case 400: return "Please fill all required fields correctly.";
        case 403: return "You are not allowed to perform this action.";
        case 404: return "Item or resource not found.";
        case 409: return "This item is already in your shopping list.";
        case 500: return "Server error. Please try again later.";
        default:  return "An unexpected error occurred.";
    }
}

function showListError(message) {
    const errorBanner = document.getElementById("slMainError");
    if (errorBanner) {
        errorBanner.textContent = message;
        errorBanner.hidden = false;
        setTimeout(() => {
            errorBanner.hidden = true;
        }, 5000);
    }
}

// ---------------------------------------------------------
// MODAL FUNCTIONS
// ---------------------------------------------------------

function openModal(modal, form, errorElement, focusInput) {
    if (form) form.reset();
    if (errorElement) errorElement.hidden = true;
    if (modal) modal.hidden = false;
    if (focusInput) focusInput.focus();
}

function closeModal(modal) {
    if (modal) modal.hidden = true;
}

// ---------------------------------------------------------
// EVENTS
// ---------------------------------------------------------

if (itemList) {
    printItems();
    itemList.addEventListener("change", getChange);
    itemList.addEventListener("click", getItemToDelete)
    if (masterCheckbox)
        masterCheckbox.addEventListener("change", checkOrUncheckAll);
}

document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener("click", (event) => {
        const parentModal = event.target.closest(".modal-backdrop");
        if (parentModal) closeModal(parentModal);
    });
});

document.querySelectorAll(".modal-backdrop").forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) closeModal(modal);
    });
});

if (addItemForm) {
    const addModal = document.getElementById("addItemModal");

    document.getElementById("openAddItemModal").addEventListener("click", () => {
        openModal(
            addModal,
            addItemForm,
            document.getElementById("addItemError"),
            document.getElementById("addItemName")
        );
    });

    addItemForm.addEventListener("submit", submitNewItem);
}

if (validateForm) {
    const valModal = document.getElementById("validateModal");

    document.getElementById("openValidateModal").addEventListener("click", () => {
        openModal(
            valModal,
            validateForm,
            document.getElementById("validateError"),
            document.getElementById("valDescription")
        );
    });

    validateForm.addEventListener("submit", submitValidation);
}