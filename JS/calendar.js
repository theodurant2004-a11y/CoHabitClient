// Calendar page (owner and roomies)
// The front only shows the events and sends what the user typed: the real checks are in the API.

//-------------- Communication with the API -----------------
const EVENTS_URL = "http://localhost:8080/CoHabitAPI/api/events";

// The icon of each type of event
const eventTypeIcons = {
    social: "🎉",
    meeting: "📋",
    visit: "🏠",
    task: "✅",
    other: "📌"
};

// This function returns the icon of a type of event or a pin if the code is unknown
function getEventIcon(code) {
    return eventTypeIcons[code] || "📌";
}

// Stops with an error if the API refused the request. The message of the API is kept for the page
async function checkResponse(response) {
    if (!response.ok) {
        const error = new Error(`Response status: ${response.status}`);
        error.status = response.status;
        try {
            error.apiMessage = (await response.json()).message;
        } catch (e) {
            console.error(e.message); // the answer has no JSON
        }
        throw error;
    }
}

// Events from "from" to "to" included. Without "to", all the events from "from"
// TODO: remove the email when the session system is efficient
async function getEvents(from, to) {
    let url = EVENTS_URL + "?email=" + encodeURIComponent(user.email) + "&from=" + from;
    if (to) {
        url += "&to=" + to;
    }
    const response = await fetch(url, { credentials: "include" });
    await checkResponse(response);
    return await response.json();
}

// Sends the new event to the API
async function createEvent(newEvent) {
    const response = await fetch(EVENTS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(newEvent)
    });
    await checkResponse(response);
}

async function getEventTypes() {

    const response = await fetch(EVENTS_URL + "/types", { credentials: "include" });
    await checkResponse(response);
    return await response.json();
}

//-------------- Data kept by the page -----------------
// The month on the screen. month goes from 0 (January) to 11 (December)
let shownYear = new Date().getFullYear();
let shownMonth = new Date().getMonth();
let monthEvents = [];
let selectedDate = null;

// Number of the last request for a month: an old answer that arrives too late is ignored
let lastMonthRequest = 0;
// Maximum number of lines in "Upcoming events"
const UPCOMING_LIMIT = 5;
// Maximum number of lines in the card of the home page
const HOME_UPCOMING_LIMIT = 3;
// The type chosen by default in the pop-up
const DEFAULT_EVENT_TYPE = "social";

// The lists of the pop-up. They are null until the API answered
let eventTypes = null;

// True while the new event is being sent, so it cannot be sent twice
let isSavingEvent = false;

//-------------- Dates -----------------
// Always local dates: toISOString() works in UTC and could give the day before or after
// A date object becomes "2026-11-05"
function toIsoDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
}

// "2026-11-05" becomes a local date object. new Date("2026-11-05") would be in UTC
function parseIsoDate(isoDate) {
    const parts = isoDate.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
}

// Display format: "Thu 5 Nov 2026"
function formatEventDate(isoDate) {
    return parseIsoDate(isoDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

// Display format: "18:00 - 20:00", "18:00", "Until 20:00" or "All day"
function formatEventTime(event) {
    if (event.startTime && event.endTime) {
        return event.startTime + " - " + event.endTime;
    }
    if (event.startTime) {
        return event.startTime;
    }
    return event.endTime ? "Until " + event.endTime : "All day";
}

//-------------- The month -----------------
// Creates one day of the grid
function createDayCell(date) {
    const isoDate = toIsoDate(date);
    const cell = createElement("button", "calendar-cell");
    cell.type = "button";
    cell.dataset.date = isoDate;
    cell.setAttribute("aria-label", date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));

    if (isoDate === toIsoDate(new Date())) {
        cell.classList.add("calendar-today");
        cell.setAttribute("aria-current", "date");
    }

    cell.appendChild(createElement("span", "calendar-number", date.getDate()));
    cell.appendChild(createElement("span", "calendar-dots"));
    return cell;
}

// Draws the shown month
function drawMonth() {
    const firstDay = new Date(shownYear, shownMonth, 1);
    const grid = document.getElementById("calendarGrid");

    document.getElementById("calendarTitle").textContent =
        firstDay.toLocaleDateString("en-GB", { month: "long", year: "numeric" });

    grid.replaceChildren();

    // getDay() starts on Sunday (0): this calculation gives the empty cells of a week starting on Monday
    const emptyCells = (firstDay.getDay() + 6) % 7;
    for (let i = 0; i < emptyCells; i++) {
        grid.appendChild(createElement("span"));
    }

    // Day 0 of the next month is the last day of this month
    const daysInMonth = new Date(shownYear, shownMonth + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        grid.appendChild(createDayCell(new Date(shownYear, shownMonth, day)));
    }
}

// Goes to the previous (-1) or to the next (+1) month. JS dates handle the change of year
function changeMonth(step) {
    const date = new Date(shownYear, shownMonth + step, 1);
    shownYear = date.getFullYear();
    shownMonth = date.getMonth();
    selectedDate = null;
    showSelectedDay();
    loadMonth();
}

//-------------- The events -----------------
// Sorted by date, then by start time. An event without a time comes first. ISO dates can be compared as text
function sortEvents(events) {
    return [...events].sort((a, b) =>
        a.date.localeCompare(b.date) || (a.startTime || "").localeCompare(b.startTime || ""));
}

// Creates one line of a list of events
function createEventItem(event) {
    const item = createElement("li", "expense-item calendar-event");
    const main = createElement("div", "expense-main");

    main.appendChild(createElement("strong", "expense-title", event.title));
    main.appendChild(createElement("span", "expense-meta", formatEventDate(event.date) + " · " + formatEventTime(event)));

    if (event.description) {
        main.appendChild(createElement("span", "expense-meta", event.description));
    }

    item.append(createElement("span", "expense-icon", getEventIcon(event.type)), main);
    return item;
}

// Adds the points under the days of the month: one point per type of event
function showDots() {
    document.querySelectorAll("#calendarGrid .calendar-cell").forEach(cell => {
        const dots = cell.querySelector(".calendar-dots");
        const dayEvents = monthEvents.filter(event => event.date === cell.dataset.date);
        const types = [...new Set(dayEvents.map(event => event.type))];
        const label = cell.getAttribute("aria-label").split(",")[0];

        dots.replaceChildren();
        types.forEach(type => dots.appendChild(createElement("span", "calendar-dot calendar-dot-" + type)));

        cell.setAttribute("aria-label", dayEvents.length > 0
            ? label + ", " + dayEvents.length + (dayEvents.length === 1 ? " event" : " events")
            : label);
    });
}

// Shows the number of upcoming events and the next ones
function showUpcoming(events) {
    const list = document.getElementById("upcomingItems");
    const count = events.length;

    document.getElementById("upcomingCount").textContent = count + (count === 1 ? " upcoming event" : " upcoming events");

    list.replaceChildren();
    sortEvents(events).slice(0, UPCOMING_LIMIT).forEach(event => list.appendChild(createEventItem(event)));
    document.getElementById("upcomingEmpty").hidden = count > 0;
}

// Shows the card "Events" 
function showHomeEvents(events) {
    const today = new Date();
    const lastDayOfMonth = toIsoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
    const list = document.getElementById("homeEventItems");

    document.getElementById("homeEventsCount").textContent = events.filter(event => event.date <= lastDayOfMonth).length;

    list.replaceChildren();
    sortEvents(events).slice(0, HOME_UPCOMING_LIMIT).forEach(event => list.appendChild(createEventItem(event)));
    document.getElementById("homeEventsEmpty").hidden = events.length > 0;
}

// Draws the shown month, then asks the API for its events
async function loadMonth() {
    const requestNumber = ++lastMonthRequest;

    monthEvents = [];
    drawMonth();
    selectDay(selectedDate);

    try {
        const from = toIsoDate(new Date(shownYear, shownMonth, 1));
        const to = toIsoDate(new Date(shownYear, shownMonth + 1, 0));
        const events = await getEvents(from, to);

        // The user changed of month in the meantime
        if (requestNumber === lastMonthRequest) {
            monthEvents = events;
            showDots();
            showSelectedDay();
            hideMessage("calendarMessage");
        }
    } catch (e) {
        console.error(e.message);
        showMessage("calendarMessage", "Unable to load the events right now.");
    }
}

async function loadUpcoming() {
    try {
        const events = await getEvents(toIsoDate(new Date()));
        showUpcoming(events);
        showHomeEvents(events);
        hideMessage("homeEventsMessage");
    } catch (e) {
        console.error(e.message);
        showMessage("calendarMessage", "Unable to load the events right now.");
        showMessage("homeEventsMessage", "Unable to load the events right now.");
    }
}

//-------------- The clicked day -----------------
// Shows the events of the clicked day under the month
function showSelectedDay() {
    const panel = document.getElementById("dayPanel");
    panel.hidden = selectedDate === null;

    if (selectedDate !== null) {
        const list = document.getElementById("dayItems");
        const events = monthEvents.filter(event => event.date === selectedDate);

        document.getElementById("dayTitle").textContent = formatEventDate(selectedDate);
        list.replaceChildren();
        sortEvents(events).forEach(event => list.appendChild(createEventItem(event)));
        document.getElementById("dayEmpty").hidden = events.length > 0;
    }
}

function selectDay(isoDate) {
    selectedDate = isoDate;
    document.querySelectorAll("#calendarGrid .calendar-cell").forEach(cell => {
        cell.classList.toggle("calendar-selected", cell.dataset.date === isoDate);
    });
    showSelectedDay();
}

//--------------- "New event" -----------------
// Create is disabled while the title or the date is missing
function updateCreateButton() {
    const title = document.getElementById("eventTitle").value.trim();
    const date = document.getElementById("eventDate").value;
    document.getElementById("createEvent").disabled = title === "" || date === "" || isSavingEvent;
}

// Creates a button of the pop-up
function createFormChip(className, text) {
    const chip = createElement("button", className, text);
    chip.type = "button";
    chip.setAttribute("aria-pressed", "false");
    return chip;
}

// Selects or unselects a button of the pop-up
function setChipSelected(chip, className, selected) {
    chip.classList.toggle(className, selected);
    chip.setAttribute("aria-pressed", String(selected));
}

// Only one type can be selected
function selectEventType(code) {
    document.querySelectorAll("#eventTypes .chip").forEach(chip => {
        setChipSelected(chip, "active", chip.dataset.code === code);
    });
}

// Fills the types and the members of the form
function fillEventForm() {
    const types = document.getElementById("eventTypes");

    types.replaceChildren();
    eventTypes.forEach(type => {
        const chip = createFormChip("chip", getEventIcon(type.code) + " " + type.label);
        chip.dataset.code = type.code;
        types.appendChild(chip);
    });
    selectEventType(DEFAULT_EVENT_TYPE);
}


// Opens the pop-up with the date already filled
async function openEventModal(isoDate) {
    try {
        // The lists are asked only once
        if (!eventTypes) {
            eventTypes = await getEventTypes();
        }
    } catch (e) {
        console.error(e.message);
        showMessage("calendarMessage", "Unable to open the form right now.");
        return;
    }

    hideMessage("calendarMessage");
    document.getElementById("eventForm").reset();
    fillEventForm();
    document.getElementById("eventDate").value = isoDate;
    hideMessage("eventError");
    updateCreateButton();
    document.getElementById("eventModal").hidden = false;
    document.getElementById("eventTitle").focus();
}

function closeEventModal() {
    document.getElementById("eventModal").hidden = true;
}

// Reads the form
function readEventForm() {

    return {
        title: document.getElementById("eventTitle").value.trim(),
        description: document.getElementById("eventDescription").value.trim(),
        date: document.getElementById("eventDate").value,
        startTime: document.getElementById("eventStart").value,
        endTime: document.getElementById("eventEnd").value,
        type: document.querySelector("#eventTypes .chip.active").dataset.code,
        roomieEmail: user.email // TODO: remove it when the session system is efficient
    };
}

// Comfort checks only. The real rules are in the API. "HH:MM" can be compared as text
function checkEventInputs(newEvent) {
    if (newEvent.startTime && newEvent.endTime && newEvent.endTime <= newEvent.startTime) {
        return "The end must be after the start.";
    }
    return "";
}

// Runs when the user clicks on Create
async function submitEvent(event) {
    event.preventDefault();

    const newEvent = readEventForm();
    const message = checkEventInputs(newEvent);
    hideMessage("eventError");

    if (message !== "") {
        showMessage("eventError", message);
    } else if (newEvent.title !== "" && newEvent.date !== "" && !isSavingEvent) {
        isSavingEvent = true;
        updateCreateButton();

        try {
            await createEvent(newEvent);
            closeEventModal();
            // We ask again so the calendar and the list show what the API saved
            await Promise.all([loadMonth(), loadUpcoming()]);
        } catch (e) {
            console.error(e.message);
            // The API explains why it refused (400, 403). Never the details of a server error
            showMessage("eventError", e.apiMessage && e.status < 500 ? e.apiMessage : "Unable to create the event right now.");
        }

        isSavingEvent = false;
        updateCreateButton();
    }
}

//-------------- Start -----------------
if (user) {
    loadMonth();
    loadUpcoming();

    document.getElementById("openEventModal").addEventListener("click", () => openEventModal(toIsoDate(new Date())));
    document.getElementById("addOnDay").addEventListener("click", () => openEventModal(selectedDate));
    document.getElementById("cancelEvent").addEventListener("click", closeEventModal);
    document.getElementById("eventForm").addEventListener("submit", submitEvent);
    document.getElementById("eventForm").addEventListener("input", updateCreateButton);

    // A click shows the events of the day, a double-click opens the pop-up with this date
    document.getElementById("calendarGrid").addEventListener("click", event => {
        const cell = event.target.closest(".calendar-cell");
        if (cell) {
            selectDay(cell.dataset.date);
        }
    });
    document.getElementById("calendarGrid").addEventListener("dblclick", event => {
        const cell = event.target.closest(".calendar-cell");
        if (cell) {
            openEventModal(cell.dataset.date);
        }
    });

    // A click outside of the white box closes the pop-up
    document.getElementById("eventModal").addEventListener("click", event => {
        if (event.target.id === "eventModal") {
            closeEventModal();
        }
    });

    // The buttons are created later, so we listen on their container
    document.getElementById("eventTypes").addEventListener("click", event => {
        const chip = event.target.closest(".chip");
        if (chip) {
            selectEventType(chip.dataset.code);
        }
    });

    document.getElementById("previousMonth").addEventListener("click", () => changeMonth(-1));
    document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));
}
