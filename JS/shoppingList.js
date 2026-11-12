const roomShare = JSON.parse(sessionStorage.getItem("roomshare"));

const SL_URL = API_BASE + "/shopping-list";

const slList = document.getElementById("sl-list-container"); // The ul tag
const slAddForm = document.getElementById("addItemForm"); // The form to add an item
const slValidateForm = document.getElementById("validateForm"); // The form to confirm the purchases
const slItemCount = document.getElementById("sl-item-count"); // The text for the item count
const slEmptyArea = document.getElementById("sl-empty"); // The message to display if there are no items
const slProgressArea = document.getElementById("sl-progress-container"); // The zone of the progress bar
const slActions = document.getElementById("sl-actions"); // The button to Validate and to Select All
const slSelectAll = document.getElementById("slSelectAll"); // The checkbox to Select All
const slAddModal = document.getElementById("addItemModal"); // The pop-up to add an item
const slValidateModal = document.getElementById("validateModal"); // The pop-up to confirm the purchases


//-------------- API calls -----------------

// Throws an error with the code and the message of the API
// And in the case that the api has no message for the error, we provide it
async function slThrowApiError(response) {
    const body = await response.json().catch(() => ({}));
    const error = new Error(body.message || slGetErrorMessage(response.status));
    error.status = response.status;
    throw error;
}

// Send the GET request with the room share id stored in session
async function slFetchItems() {
    const response = await fetch(SL_URL + "/" + roomShare.id, {
        credentials: "include"
    });

    // If there is a problem, an error will be thrown
    if (!response.ok) {
        await slThrowApiError(response);
    }

    return await response.json(); // Return the list of the items, even if it's empty
}

// Send the POST request to send the object received
async function slSendNewItem(newItem) {
    const response = await fetch(SL_URL + "/" + roomShare.id, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newItem) // We put in the body of the request the variable converted into a JSON object
    });

    if (!response.ok) {
        await slThrowApiError(response);
    }
}

// The method to send a change with the PUT verb
// We have to specify the product id and the room share id to find which item must be changed
async function slSendChange(productId, change) {
    const response = await fetch(SL_URL + "/" + roomShare.id + "/" + productId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(change)
    });

    if (!response.ok) {
        await slThrowApiError(response);
    }
}

// The method to send the ids of the item to delete with de verb DELETE
async function slSendDelete(productId) {
    const response = await fetch(SL_URL + "/" + roomShare.id + "/" + productId, {
        method: "DELETE",
        credentials: "include" // There's no body because all the data are in the URI
    });

    if (!response.ok) {
        await slThrowApiError(response);
    }
}

// The method to send the JSON object with the data needed to confirm the purchases
async function slSendValidation(validation) {
    // Just for this method, we use the id of the room share
    const response = await fetch(SL_URL + "/" + roomShare.id + "/purchases", {
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
// This corresponds to certain status codes that may occur,
// but which do not originate from our exceptions
function slGetErrorMessage(status) {
    switch (status) {
        case 401: return "Please sign in again. Your session has expired.";
        case 403: return "You don't have permission to perform this action.";
        case 404: return "The requested resource could not be found.";
        case 500: return "The server encountered an error. Please try again.";
        default:  return "An unexpected connection error occurred.";
    }
}


//-------------- Display -----------------

// Shows the shopping list stats on the home page (small card and the panel)
function showHomeShopping(total, checked) {
    const countEl = document.getElementById("homeShoppingCount");
    const noteEl = document.getElementById("homeShoppingNote");
    const progressCount = document.getElementById("homeShoppingProgressCount");
    const progressPercent = document.getElementById("homeShoppingProgressPercent");
    const progressFill = document.getElementById("homeShoppingProgressFill");

    if (!countEl || !progressCount) return;

    const left = total - checked;

    // Update the small stat card
    countEl.textContent = left;
    noteEl.textContent = left === 1 ? "item left" : "items left";

    // Update the big panel progress bar
    const percent = total === 0 ? 0 : Math.round((checked / total) * 100);
    progressCount.textContent = `${checked}/${total} found`;
    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
}

// The method to show the error messages about the list of items in a paragraph
function slShowListError(message) {
    const errorBanner = document.getElementById("slMainError");
    errorBanner.textContent = message; // We replace the content by the message in parameter
    errorBanner.hidden = false; // We make the paragraph visible
    setTimeout(() => {
        errorBanner.hidden = true;
    }, 5000); // While 5 seconds, you see the message and after that, it disappears
}

// The method to show the error messages in the form pop-ups
function slShowFormError(errorElement, message, input) {
    errorElement.textContent = message;
    errorElement.hidden = false;
    if (input) {
        input.focus(); // Put the focus on the input concerned by the error
    }
}

// The method to upgrade the progress bar when there is an update on the data
function slUpdateProgressBar() {
    const total = slList.querySelectorAll(".sl-checkbox").length; // Number of all the checkboxes
    const checked = slList.querySelectorAll(".sl-checkbox:checked").length; // Number of checked checkboxes

    // We put the Select All input checkbox checked status on true when there's at least one item in the list
    // and when all the checkboxes are checked
    // Else, we put it on false
    slSelectAll.checked = total > 0 && checked === total;
    document.getElementById("openValidateModal").hidden = checked === 0; // If there's at least one item checked, we display the validation button

    // The calculation to have the percent of found items
    const percent = total === 0 ? 0 : Math.round((checked / total) * 100);

    // Update of the text zones with the updated data
    document.getElementById("sl-progress-count").textContent = `${checked}/${total} found`;
    document.getElementById("sl-progress-percent").textContent = `${percent}%`;
    document.getElementById("sl-progress-fill").style.width = `${percent}%`;

    // To update in the home page
    showHomeShopping(total, checked);
}

// Creates one line of the list
function slCreateItem(item) {
    const li = document.createElement("li");
    li.classList.add("sl-item");
    // The id of the product is kept in a data attribute
    li.dataset.productId = item.productId;

    const inputCheck = document.createElement("input");
    inputCheck.type = "checkbox";
    inputCheck.checked = item.found;
    inputCheck.classList.add("sl-checkbox");

    const spanName = document.createElement("span");
    spanName.textContent = item.productName;
    spanName.classList.add("sl-item-name");

    const spanCategory = document.createElement("span");
    spanCategory.textContent = item.productCategory;
    spanCategory.classList.add("sl-item-category");

    const inputQty = document.createElement("input");
    inputQty.type = "text";
    inputQty.classList.add("sl-item-qty-input");
    inputQty.value = item.quantity;

    const button = document.createElement("button");
    button.textContent = "×";
    button.classList.add("sl-btn-delete");
    button.setAttribute("aria-label", "Delete " + item.productName);

    li.append(inputCheck, spanName, spanCategory, inputQty, button);
    return li;
}

async function slLoadItems() {
    try {
        const items = await slFetchItems();

        // To update the progress bar in the home page
        const checked = items.filter(item => item.found).length;
        showHomeShopping(items.length, checked);

        slItemCount.textContent = items.length === 1 ? "1 item in the list" : `${items.length} items in the list`;

        if (items.length === 0) {
            slEmptyArea.hidden = false;
            slProgressArea.hidden = true;
            slActions.hidden = true;
            slList.hidden = true;
            return;
        }

        slEmptyArea.hidden = true;
        slProgressArea.hidden = false;
        slActions.hidden = false;
        slList.hidden = false;

        const ul = document.createElement("ul");
        ul.classList.add("sl-list");
        items.forEach(item => ul.appendChild(slCreateItem(item)));

        slList.replaceChildren(ul);
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
    const qtyInput = document.getElementById("addItemQty");
    const catInput = document.getElementById("addItemCategory");

    const name = nameInput.value.trim();
    const quantity = qtyInput.value.trim();
    const category = catInput.value.trim();

    if (!name) {
        slShowFormError(errorText, "The item name is required.", nameInput);
        return;
    }

    if (name.length > 50) {
        slShowFormError(errorText, "The item name must be less than 50 characters.", nameInput);
        return;
    }

    if (!quantity) {
        slShowFormError(errorText, "The quantity is required.", qtyInput);
        return;
    }

    if (quantity.length > 50) {
        slShowFormError(errorText, "The quantity must be less than 50 characters.", qtyInput);
        return;
    }

    if (!category) {
        slShowFormError(errorText, "The category is required.", catInput);
        return;
    }

    if (category.length > 50) {
        slShowFormError(errorText, "The category must be less than 50 characters.", catInput);
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

    if (target.classList.contains("sl-checkbox")) {
        const itemLi = target.closest(".sl-item");
        const isChecked = target.checked;

        slUpdateProgressBar();
        try {
            await slSendChange(itemLi.dataset.productId, { status: isChecked });
        } catch (error) {
            console.error(error.message);
            slShowListError(error.message);

            // If the API refuses, we return to the initial state
            target.checked = !isChecked;
            slUpdateProgressBar();
        }
    }
    else if (target.classList.contains("sl-item-qty-input")) {
        const itemLi = target.closest(".sl-item");
        const quantity = target.value.trim();

        try {
            await slSendChange(itemLi.dataset.productId, { quantity: quantity });
        } catch (error) {
            console.error(error.message);
            slShowListError(error.message);
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

    if (description.length > 50) {
        slShowFormError(errorText, "The description must be less than 50 characters.", descriptionInput);
        return;
    }

    if (!amountStr || isNaN(amount) || amount <= 0) {
        slShowFormError(errorText, "Please enter a valid amount greater than 0.", amountInput);
        return;
    }

    try {
        await slSendValidation({ description, amount, paidBy: user.id_person });
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


    const allModals = [slAddModal, slValidateModal];
    allModals.forEach(modal => {
        // If the Cancel button is clicked
        modal.querySelector("[data-close-modal]").addEventListener("click", () => slCloseModal(modal));

        // If the dark background is clicked
        modal.addEventListener("click", event => {
            if (event.target === modal) {
                slCloseModal(modal);
            }
        });

        // If the Escape key is pressed, it closes the pop-up that is open
        document.addEventListener("keydown", event => {
            if (event.key === "Escape") {
                slCloseModal(modal);
            }
        });
    });
}