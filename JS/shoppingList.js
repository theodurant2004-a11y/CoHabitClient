const SL_URL = API_BASE + "/users/" + user.id_person + "/shopping-items";

const slList = document.getElementById("sl-list-container");
const slAddForm = document.getElementById("addItemForm");
const slValidateForm = document.getElementById("validateForm");
const slItemCount = document.getElementById("sl-item-count");
const slEmptyArea = document.getElementById("sl-empty");
const slProgressArea = document.getElementById("sl-progress-container");
const slActions = document.getElementById("sl-actions");
const slSelectAll = document.getElementById("slSelectAll");
const slAddModal = document.getElementById("addItemModal");
const slValidateModal = document.getElementById("validateModal");

//-------------- API calls -----------------

// Throws an error with the code and the message of the API
async function slThrowApiError(response) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.message || slGetErrorMessage(response.status));
    error.status = response.status;
    throw error;
}

async function slFetchItems() {
    const response = await fetch(SL_URL, {
        credentials: "include"
    });

    if (!response.ok) {
        await slThrowApiError(response);
    }

    return await response.json();
}

async function slSendNewItem(newItem) {
    const response = await fetch(SL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newItem)
    });

    if (!response.ok) {
        await slThrowApiError(response);
    }
}

async function slSendChange(productId, change) {
    const response = await fetch(SL_URL + "/" + productId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(change)
    });

    if (!response.ok) {
        await slThrowApiError(response);
    }
}

async function slSendDelete(productId) {
    const response = await fetch(SL_URL + "/" + productId, {
        method: "DELETE",
        credentials: "include"
    });

    if (!response.ok) {
        await slThrowApiError(response);
    }
}

async function slSendValidation(validation) {
    const response = await fetch(SL_URL + "/confirm-purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(validation)
    });

    if (!response.ok) {
        await slThrowApiError(response);
    }
}

// Used only when the API does not send a message
function slGetErrorMessage(status) {
    switch (status) {
        case 400: return "Please fill all required fields correctly.";
        case 403: return "You are not allowed to perform this action.";
        case 404: return "Item or resource not found.";
        case 409: return "This item is already in your shopping list.";
        case 500: return "Server error. Please try again later.";
        default:  return "An unexpected error occurred.";
    }
}

//-------------- Display -----------------

function slShowListError(message) {
    const errorBanner = document.getElementById("slMainError");
    errorBanner.textContent = message;
    errorBanner.hidden = false;
    setTimeout(() => {
        errorBanner.hidden = true;
    }, 5000);
}

function slShowFormError(errorElement, message, input) {
    errorElement.textContent = message;
    errorElement.hidden = false;
    if (input) {
        input.focus();
    }
}

function slUpdateProgressBar() {
    const total = slList.querySelectorAll(".sl-checkbox").length;
    const checked = slList.querySelectorAll(".sl-checkbox:checked").length;

    slSelectAll.checked = total > 0 && checked === total;
    document.getElementById("openValidateModal").hidden = checked === 0;

    const percent = total === 0 ? 0 : Math.round((checked / total) * 100);

    document.getElementById("sl-progress-count").textContent = `${checked}/${total} found`;
    document.getElementById("sl-progress-percent").textContent = `${percent}%`;
    document.getElementById("sl-progress-fill").style.width = `${percent}%`;
}

// Creates one line of the list
function slCreateItem(item) {
    const li = document.createElement("li");
    li.classList.add("sl-item");
    // The id of the product is kept in a data attribute (an id="3" could collide with another element)
    li.dataset.productId = item.productId;

    const inputCheck = document.createElement("input");
    inputCheck.type = "checkbox";
    inputCheck.checked = item.found;
    inputCheck.classList.add("sl-checkbox");

    const span = document.createElement("span");
    span.textContent = item.productName;
    span.classList.add("sl-item-name");

    const inputQty = document.createElement("input");
    inputQty.type = "text";
    inputQty.classList.add("sl-item-qty-input");
    inputQty.value = item.quantity ?? "";

    const button = document.createElement("button");
    button.type = "button";
    button.textContent = "×";
    button.classList.add("sl-btn-delete");
    button.setAttribute("aria-label", "Delete " + item.productName);

    li.append(inputCheck, span, inputQty, button);
    return li;
}

async function slLoadItems() {
    try {
        const items = await slFetchItems();

        slItemCount.textContent = items.length;
        slEmptyArea.hidden = items.length > 0;
        slProgressArea.hidden = items.length === 0;
        slActions.hidden = items.length === 0;

        const ul = document.createElement("ul");
        ul.classList.add("sl-list");
        items.forEach(item => ul.appendChild(slCreateItem(item)));

        slList.replaceChildren(ul);
        slList.hidden = false;

        slUpdateProgressBar();
    } catch (error) {
        console.error(error.message);
        slShowListError(error.message);
    }
}

//-------------- Add an item -----------------

async function slSubmitNewItem(event) {
    event.preventDefault();

    const nameInput = document.getElementById("addItemName");
    const errorText = document.getElementById("addItemError");

    const name = nameInput.value.trim();
    const quantity = document.getElementById("addItemQty").value.trim();
    const category = document.getElementById("addItemCategory").value.trim();

    if (!name) {
        slShowFormError(errorText, "The item name is required.", nameInput);
        return;
    }

    if (name.length > 50) {
        slShowFormError(errorText, "The item name must be less than 50 characters.", nameInput);
        return;
    }

    try {
        await slSendNewItem({ name, quantity, category });
        slCloseModal(slAddModal);
        await slLoadItems();
    } catch (e) {
        slShowFormError(errorText, e.message);
    }
}

//-------------- Check / quantity / delete -----------------

// Checks or unchecks every item
async function slCheckOrUncheckAll(event) {
    const isChecked = event.target.checked;
    const boxList = slList.querySelectorAll(".sl-checkbox");

    boxList.forEach(box => box.checked = isChecked);
    slUpdateProgressBar();

    for (const box of boxList) {
        const itemLi = box.closest(".sl-item");
        const quantity = itemLi.querySelector(".sl-item-qty-input").value;

        try {
            await slSendChange(itemLi.dataset.productId, { quantity, status: isChecked });
        } catch (error) {
            box.checked = !isChecked;
            console.error(error.message);
            slShowListError(error.message);
        }
    }

    slUpdateProgressBar();
}

// A checkbox or a quantity changed
async function slHandleChange(event) {
    const target = event.target;

    if (target.classList.contains("sl-checkbox") || target.classList.contains("sl-item-qty-input")) {
        const itemLi = target.closest(".sl-item");
        const quantity = itemLi.querySelector(".sl-item-qty-input").value;
        const isChecked = itemLi.querySelector(".sl-checkbox").checked;

        slUpdateProgressBar();
        try {
            await slSendChange(itemLi.dataset.productId, { quantity, status: isChecked });
        } catch (error) {
            console.error(error.message);
            slShowListError(error.message);

            // The API refused: the box goes back to what it was
            if (target.classList.contains("sl-checkbox")) {
                target.checked = !isChecked;
                slUpdateProgressBar();
            }
        }
    }
}

async function slHandleDelete(event) {
    const button = event.target.closest(".sl-btn-delete");

    if (button) {
        const itemLi = button.closest(".sl-item");

        try {
            await slSendDelete(itemLi.dataset.productId);
            await slLoadItems();
        } catch (error) {
            console.error(error.message);
            slShowListError(error.message);
        }
    }
}

//-------------- Validate the purchases -----------------

async function slSubmitValidation(event) {
    event.preventDefault();

    const descriptionInput = document.getElementById("valDescription");
    const amountInput = document.getElementById("valAmount");
    const errorText = document.getElementById("validateError");

    const description = descriptionInput.value.trim();
    const amountStr = amountInput.value.trim();
    const amount = parseFloat(amountStr);

    if (!description) {
        slShowFormError(errorText, "Please provide a description.", descriptionInput);
        return;
    }

    if (!amountStr || isNaN(amount) || amount <= 0) {
        slShowFormError(errorText, "Please enter a valid amount greater than 0.", amountInput);
        return;
    }

    try {
        await slSendValidation({ description, amount });
        slCloseModal(slValidateModal);
        await slLoadItems();
    } catch (e) {
        slShowFormError(errorText, e.message);
    }
}

//-------------- Pop-ups -----------------

function slOpenModal(modal, form, errorElement, focusInput) {
    form.reset();
    errorElement.hidden = true;
    modal.hidden = false;
    focusInput.focus();
}

function slCloseModal(modal) {
    modal.hidden = true;
}

//-------------- Start -----------------

// app.js removes the roomie blocks (data-role="roomie") for an owner, so we start only if the page exists
if (slList) {
    slLoadItems();

    slList.addEventListener("change", slHandleChange);
    slList.addEventListener("click", slHandleDelete);
    slSelectAll.addEventListener("change", slCheckOrUncheckAll);

    document.getElementById("openAddItemModal").addEventListener("click", () => {
        slOpenModal(slAddModal, slAddForm,
            document.getElementById("addItemError"), document.getElementById("addItemName"));
    });

    document.getElementById("openValidateModal").addEventListener("click", () => {
        slOpenModal(slValidateModal, slValidateForm,
            document.getElementById("validateError"), document.getElementById("valDescription"));
    });

    slAddForm.addEventListener("submit", slSubmitNewItem);
    slValidateForm.addEventListener("submit", slSubmitValidation);

    // Only the 2 pop-ups of this page (the other pages manage their own pop-ups)
    [slAddModal, slValidateModal].forEach(modal => {
        // "Cancel" button
        modal.querySelector("[data-close-modal]").addEventListener("click", () => slCloseModal(modal));

        // Click on the dark background
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                slCloseModal(modal);
            }
        });
    });

    // Escape closes the pop-up that is open
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            slCloseModal(slAddModal);
            slCloseModal(slValidateModal);
        }
    });
}