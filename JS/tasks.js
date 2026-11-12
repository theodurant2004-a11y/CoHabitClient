// Tasks page - ROOMIE part

// This file only DISPLAYS the tasks and sends what the user typed.
// We do this because the rules (name length, date in the past, who can be assigned...) are in the API.
// It uses createElement, showMessage, hideMessage and formatDate, which are written in expenses-roomie.js
// (so tasks.js must be loaded AFTER expenses-roomie.js in app.html)

// The url of the API for the tasks
const TASKS_URL = API_BASE + "/tasks";

// The icons of the buttons: SVG drawn with lines, like the icons of the sidebar
// The color comes from the CSS (stroke: currentColor)
const EDIT_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 20h9"/>' +
    '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>' +
    '</svg>';

const DELETE_ICON =
    '<svg viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M3 6h18"/>' +
    '<path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/>' +
    '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +
    '<path d="M10 11v6M14 11v6"/>' +
    '</svg>';

//-------------- Asking the API -----------------
// This function is used to ask the API for the tasks of the roomshare and for the roomies a task can be given to
async function getTasksData() {
    // TO DO : remove the email when the session system is efficient
    const response = await fetch(TASKS_URL + "?roomieEmail=" + encodeURIComponent(user.email), {
        credentials: "include"   // sends the cookie of the user
    });

    // If the API did not answer with a 2xx code, we stop and the caller shows an error message
    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    return await response.json();
}

// This function is used to send a request with a JSON body (POST to add, PUT to update or change the status)
async function sendTaskJson(url, method, data) {
    const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
    });

    // We keep the code and the message of the API so the page can show why it refused
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const error = new Error(`Response status: ${response.status}`);
        error.status = response.status;
        error.apiMessage = body.message;
        throw error;
    }
}

// This function is used to delete a task
// A DELETE has no body (the email is in the URL) and the API answers 204 without JSON
async function sendTaskDelete(url) {
    const response = await fetch(url, {
        method: "DELETE",
        credentials: "include"
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }
}

//-------------- Data kept by the page -----------------
// Everything the API answered (null until it answered). We keep it to change the filter without asking again
let tasksData = null;

// The filter chosen by the user: "all", "mine", "pending" or "completed"
let currentTaskFilter = "all";

// The task that is being edited in the pop-up (null when the pop-up adds a new task)
let editingTask = null;

// The task that the user wants to delete (kept while the pop-up "Delete task" is open)
let deletingTask = null;

//-------------- Small helpers -----------------
// "Nora" + "Lfarh" becomes "NL" (only a display format)
function initialsOf(roomie) {
    return (roomie.firstName.charAt(0) + roomie.lastName.charAt(0)).toUpperCase();
}

// True if the task matches the chosen filter ("mine" = I am one of the roomies of the task)
function matchesTaskFilter(task, filter) {
    let matches = false;

    if (filter === "all") {
        matches = true;
    } else if (filter === "mine") {
        matches = task.roomies.some(roomie => roomie.id === user.id_person);
    } else {
        matches = task.status === filter;
    }

    return matches;
}

//-------------- Show the data -----------------
// This function creates ONE line of the list of tasks
// It receives one task (an object sent by the API) and returns the <li> ready to be added in the page
function createTaskItem(task) {
    const item = createElement("li", "task-item");

    // The checkbox is checked when the task is completed. The id of the task is kept in it
    const checkbox = createElement("input", "task-check");
    checkbox.type = "checkbox";
    checkbox.checked = task.status === "completed";
    checkbox.dataset.id = task.id;

    // The name, the description (if there is one) and a small line with the roomies and the date
    const main = createElement("div", "task-main");
    main.appendChild(createElement("strong", "task-name", task.name));

    if (task.description) {
        main.appendChild(createElement("span", "task-description", task.description));
    }

    const meta = createElement("div", "task-meta");
    task.roomies.forEach(roomie => {
        const dot = createElement("span", "task-dot", initialsOf(roomie));
        dot.title = roomie.firstName + " " + roomie.lastName;
        meta.appendChild(dot);
    });

    if (task.dueDate) {
        meta.appendChild(createElement("span", "task-date", "Due " + formatDate(task.dueDate)));
    }
    main.appendChild(meta);

    // A completed task is crossed out (the css class "done")
    if (task.status === "completed") {
        item.classList.add("done");
    }

    // The buttons to edit and delete the task, on the right
    // The task object is given directly to the functions: no need to find it again with its id
    const actions = createElement("div", "task-actions");

    const editButton = createElement("button", "task-edit");
    editButton.type = "button";
    editButton.innerHTML = EDIT_ICON;                        // the icon (fixed text, not a user value)
    editButton.title = "Edit the task";
    editButton.setAttribute("aria-label", "Edit the task");  // read by screen readers: the button has no text anymore
    editButton.addEventListener("click", () => openTaskModal(task));

    const deleteButton = createElement("button", "task-delete");
    deleteButton.type = "button";
    deleteButton.innerHTML = DELETE_ICON;
    deleteButton.title = "Delete the task";
    deleteButton.setAttribute("aria-label", "Delete the task");
    deleteButton.addEventListener("click", () => openDeleteTaskModal(task));

    actions.append(editButton, deleteButton);

    item.append(checkbox, main, actions);
    return item;
}

// This function shows my pending tasks on the home page (the small card and the panel)
function showHomeTasks(tasks) {
    const countElement = document.getElementById("homeTasksCount");
    const list = document.getElementById("homeTaskItems");
    const emptyMessage = document.getElementById("homeTasksEmpty");

    if (countElement && list && emptyMessage) {
        const myPending = tasks.filter(task =>
            task.status === "pending" && matchesTaskFilter(task, "mine"));

        countElement.textContent = myPending.length;

        list.replaceChildren();
        myPending.slice(0, 4).forEach(task => {
            const item = createElement("li", "home-task-item");
            item.appendChild(createElement("span", "home-task-name", task.name));

            if (task.dueDate) {
                item.appendChild(createElement("span", "home-task-date", "Due " + formatDate(task.dueDate)));
            }
            list.appendChild(item);
        });

        if (myPending.length > 4) {
            list.appendChild(createElement("li", "home-task-more", "+ " + (myPending.length - 4) + " more"));
        }

        emptyMessage.hidden = myPending.length > 0;
    }
}

// This function shows the list of tasks, but only the ones that match the chosen filter
function showTasks(tasks, filter) {
    const list = document.getElementById("taskItems");

    // We empty the list first, otherwise the lines would be added twice at each refresh
    list.replaceChildren();

    tasks.forEach(task => {
        if (matchesTaskFilter(task, filter)) {
            list.appendChild(createTaskItem(task));
        }
    });

    // The message "No task here" is shown only when the list is empty
    document.getElementById("tasksEmpty").hidden = list.children.length > 0;
}

// This function writes the number of tasks in each filter button and in the subtitle
// (only a count to display: the filters are only a display choice)
function showTaskCounts(tasks) {
    document.querySelectorAll(".task-filter").forEach(button => {
        const count = tasks.filter(task => matchesTaskFilter(task, button.dataset.filter)).length;
        button.textContent = button.dataset.label + " (" + count + ")";
    });

    const pending = tasks.filter(task => task.status === "pending").length;
    const completed = tasks.length - pending;
    document.getElementById("tasksSummary").textContent = pending + " pending · " + completed + " completed";
}

// This function is used to change the filter of the list
function changeTaskFilter(filter) {
    // We remember the chosen filter, it is used again when the list is reloaded
    currentTaskFilter = filter;

    // Only the chosen button is highlighted
    document.querySelectorAll(".task-filter").forEach(button => {
        button.classList.toggle("active", button.dataset.filter === filter);
    });

    // We already have the data, so no need to ask the API again
    if (tasksData) {
        showTasks(tasksData.tasks, currentTaskFilter);
    }
}

//-------------- Check / uncheck a task -----------------
// This function runs when the user clicks on the checkbox of a task
async function toggleTask(checkbox) {
    // The API only accepts "completed" or "pending"
    const status = checkbox.checked ? "completed" : "pending";

    hideMessage("tasksMessage");

    try {
        await sendTaskJson(TASKS_URL + "/" + checkbox.dataset.id + "/status", "PUT",
            { status: status, roomieEmail: user.email });

        // We ask the API again so the counts and the list are the ones of the database
        await loadTasks();
    } catch (e) {
        console.error(e.message);

        // The API refused: the box goes back to what it was
        checkbox.checked = !checkbox.checked;
        showMessage("tasksMessage", "Unable to update the task right now.");
    }
}

//-------------- Delete a task -----------------
// This function runs when the user clicks on the delete button of a task: it opens the pop-up to confirm
function openDeleteTaskModal(task) {
    deletingTask = task;
    document.getElementById("deleteTaskName").textContent = task.name;
    document.getElementById("deleteTaskModal").hidden = false;
}

// This function closes the pop-up "Delete task"
function closeDeleteTaskModal() {
    document.getElementById("deleteTaskModal").hidden = true;
}

// This function runs when the user clicks on "Delete" in the pop-up
async function confirmDeleteTask() {
    closeDeleteTaskModal();
    hideMessage("tasksMessage");

    try {
        // TO DO : remove the email when the session system is efficient
        await sendTaskDelete(TASKS_URL + "/" + deletingTask.id + "?roomieEmail=" + encodeURIComponent(user.email));

        // We ask the API again so the task disappears from the list and the counts
        await loadTasks();
    } catch (e) {
        console.error(e.message);
        showMessage("tasksMessage", "Unable to delete the task right now.");
    }
}

//-------------- Pop-up "New task" / "Edit Task"-----------------
// This function returns the ids of the roomies that are selected in "Assigned to"
function getSelectedAssigneeIds() {
    const ids = [];
    document.querySelectorAll("#taskAssignees .task-chip.selected").forEach(chip => {
        // dataset.id is a text, so we transform it into a number
        ids.push(Number(chip.dataset.id));
    });
    return ids;
}

// This function writes the number of selected roomies in "Assigned to (n)"
function updateAssigneeCount() {
    document.getElementById("assigneeCount").textContent = getSelectedAssigneeIds().length;
}

// This function creates one button per roomie of the roomshare (the list comes from the API)
// selectedIds: the ids of the roomies that are selected when the pop-up opens
function fillAssignees(roomies, selectedIds) {
    const container = document.getElementById("taskAssignees");
    container.replaceChildren();

    roomies.forEach(roomie => {
        const chip = createElement("button", "task-chip", roomie.firstName);
        chip.type = "button";                 // so it does not submit the form
        chip.dataset.id = roomie.id;          // we keep the id in the button to find it later

        if (selectedIds.includes(roomie.id)) {
            chip.classList.add("selected");
        }
        container.appendChild(chip);
    });

    updateAssigneeCount();
}

// The button "Create" stays faded until a title is typed
function updateCreateTaskButton() {
    const title = document.getElementById("taskTitle").value.trim();
    document.getElementById("createTask").disabled = title === "";
}

// This function opens the pop-up
// task = null to add a new task, or the task to edit (its values are written in the fields)
function openTaskModal(task) {
    // We open it only if the API answered, because the roomies of the form come from it
    if (tasksData) {
        editingTask = task;
        document.getElementById("taskForm").reset();            // we clear what was typed last time

        // "en-CA" is used because this language writes the date like 2026-10-20
        const today = new Date().toLocaleDateString("en-CA");
        const dueDateInput = document.getElementById("taskDueDate");

        if (task) {
            // EDIT: the fields are filled with the values of the task
            document.getElementById("taskModalTitle").textContent = "Edit task";
            document.getElementById("createTask").textContent = "Save";

            document.getElementById("taskTitle").value = task.name;
            document.getElementById("taskDescription").value = task.description || "";
            dueDateInput.value = task.dueDate || "";

            // The roomies already assigned are selected
            fillAssignees(tasksData.roomies, task.roomies.map(roomie => roomie.id));

            // A late task can keep its old date (the API allows it), so the old date stays possible
            dueDateInput.min = (task.dueDate && task.dueDate < today) ? task.dueDate : today;
        } else {
            // ADD: empty fields, the user is selected by default
            document.getElementById("taskModalTitle").textContent = "New task";
            document.getElementById("createTask").textContent = "Create";

            fillAssignees(tasksData.roomies, [user.id_person]);

            // A new task cannot be in the past: the browser greys the old days in the calendar
            dueDateInput.min = today;
        }

        updateCreateTaskButton();
        hideMessage("taskError");                                // no old error message
        document.getElementById("taskModal").hidden = false;     // the pop-up is now visible
        document.getElementById("taskTitle").focus();            // the cursor is ready in the first field
    }
}

// This function closes the pop-up
function closeTaskModal() {
    document.getElementById("taskModal").hidden = true;
}

// Checks the values typed by the user and returns an error message ("" if everything is fine)
// The other rules (length, date...) are checked by the API
function checkTaskInputs(title) {
    let message = "";

    if (title === "") {
        message = "The title is required.";
    }

    return message;
}

// This function runs when the user clicks on "Create" or "Save" in the pop-up
async function submitTask(event) {
    // A form reloads the page by default, we do not want that
    event.preventDefault();

    const name = document.getElementById("taskTitle").value.trim();
    const description = document.getElementById("taskDescription").value.trim();
    const dueDate = document.getElementById("taskDueDate").value;      // "" if no date
    const roomieIds = getSelectedAssigneeIds();

    const message = checkTaskInputs(name);

    if (message !== "") {
        showMessage("taskError", message);
    } else {
        hideMessage("taskError");

        try {
            // TO DO : remove roomieEmail when the session system is efficient
            if (editingTask) {
                // PUT replaces the whole task, so the status is sent too (it does not change here)
                await sendTaskJson(TASKS_URL + "/" + editingTask.id, "PUT",
                    { name, description, dueDate, status: editingTask.status, roomieIds, roomieEmail: user.email });
            } else {
                // The status is not sent: the API puts "pending" by default
                await sendTaskJson(TASKS_URL, "POST",
                    { name, description, dueDate, roomieIds, roomieEmail: user.email });
            }

            closeTaskModal();

            // We ask the API again so the list shows the new values
            await loadTasks();
        } catch (e) {
            console.error(e.message);

            // 400: the API refused what was typed, we show its message
            // 404: the task was deleted by another roomie in the meantime
            let errorMessage = editingTask ? "Unable to save the task right now." : "Unable to add the task right now.";
            if (e.status === 400 && e.apiMessage) {
                errorMessage = e.apiMessage;
            } else if (e.status === 404) {
                errorMessage = "This task does not exist anymore.";
            }
            showMessage("taskError", errorMessage);
        }
    }
}

//-------------- Start -----------------
// This function asks the API for the data and shows everything on the page
// It is used when the page opens and after a change (new task, check / uncheck)
async function loadTasks() {
    try {
        tasksData = await getTasksData();

        hideMessage("tasksMessage");     // if there was an error before, we remove it
        showTaskCounts(tasksData.tasks);
        showTasks(tasksData.tasks, currentTaskFilter);
        showHomeTasks(tasksData.tasks);
    } catch (e) {
        console.error(e.message);
        showMessage("tasksMessage", "Unable to load the tasks right now.");
    }
}

// Events :
// app.js removes the tasks page for an owner (applyRole), so we start only when it exists.
// Without this check, the code below would crash for an owner because the buttons would not exist
const tasksPage = document.querySelector(".tasks-page");

if (tasksPage) {
    loadTasks();

    // Buttons of the pop-up

    // null = a new task. We cannot write addEventListener("click", openTaskModal) anymore:
    // the browser would give the click event to openTaskModal, which would think it is a task to edit
    document.getElementById("openTaskModal").addEventListener("click", () => openTaskModal(null));

    document.getElementById("cancelTask").addEventListener("click", closeTaskModal);
    document.getElementById("taskForm").addEventListener("submit", submitTask);
    document.getElementById("taskTitle").addEventListener("input", updateCreateTaskButton);

    // A click outside of the white box closes the pop-up
    document.getElementById("taskModal").addEventListener("click", event => {
        if (event.target.id === "taskModal") {
            closeTaskModal();
        }
    });

    // Buttons of the pop-up "Delete task"
    document.getElementById("cancelDeleteTask").addEventListener("click", closeDeleteTaskModal);
    document.getElementById("confirmDeleteTask").addEventListener("click", confirmDeleteTask);

    // A click outside of the white box closes the pop-up "Delete task"
    document.getElementById("deleteTaskModal").addEventListener("click", event => {
        if (event.target.id === "deleteTaskModal") {
            closeDeleteTaskModal();
        }
    });

    // A click on a roomie button selects / unselects it
    // The buttons are created later by fillAssignees, so we listen on their parent
    document.getElementById("taskAssignees").addEventListener("click", event => {
        const chip = event.target.closest(".task-chip");
        if (chip) {
            chip.classList.toggle("selected");
            updateAssigneeCount();
        }
    });

    // A click on a checkbox of the list (the lines are created later, so we listen on the list)
    document.getElementById("taskItems").addEventListener("change", event => {
        if (event.target.matches(".task-check")) {
            toggleTask(event.target);
        }
    });

    // The four filters (All, Mine, Pending, Completed)
    document.querySelectorAll(".task-filter").forEach(button => {
        button.addEventListener("click", () => changeTaskFilter(button.dataset.filter));
    });
}