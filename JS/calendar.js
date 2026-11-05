// Calendar page (owner and roomies)
// The front only shows the events and sends what the user typed: the real checks are in the API.

//-------------- Data kept by the page -----------------
// The month on the screen. month goes from 0 (January) to 11 (December), like in JS dates
let shownYear = new Date().getFullYear();
let shownMonth = new Date().getMonth();

//-------------- Dates -----------------
// Always local dates: toISOString() works in UTC and could give the day before or after
// A date object becomes "2026-11-05"
function toIsoDate(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + month + "-" + day;
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
    drawMonth();
}

//-------------- Start -----------------
if (user) {
    drawMonth();

    document.getElementById("previousMonth").addEventListener("click", () => changeMonth(-1));
    document.getElementById("nextMonth").addEventListener("click", () => changeMonth(1));
}
