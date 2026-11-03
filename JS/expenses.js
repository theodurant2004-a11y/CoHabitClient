function showTab(event) {
    const clickedTab = event.currentTarget;

    document.querySelectorAll(".tab").forEach(tab => {
        tab.classList.toggle("active", tab === clickedTab);
    });

    document.querySelectorAll(".tab-panel").forEach(panel => {
        panel.hidden = panel.id !== "tab-" + clickedTab.dataset.tab;
    });
}

// Show roomies in formular for rent and expenses
function showRentMembers() {
    const container = document.getElementById("rentMembers");

    // The rent form is removed for a roomie
    if (container) {
        container.replaceChildren(); 

        if (roomshare.roomies.length === 0) {
            const empty = document.createElement("p");
            empty.className = "form-sub";
            empty.textContent = "No roomie in the roomshare !";
            container.append(empty);
        }

        roomshare.roomies.forEach(roomie => {
            const chip = document.createElement("label");
            chip.className = "chip";

            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.value = roomie.id_person;
            checkbox.checked = true;
            checkbox.addEventListener("change", updateRentCount);

            // textContent: the name is typed by a user, so no innerHTML (XSS)
            chip.append(checkbox, roomie.firstName + " " + roomie.lastName);
            container.append(chip);
        });

        updateRentCount();
    }
}

// Returns the ids of the selected roomies
function getSelectedRoomies() {
    const checked = document.querySelectorAll("#rentMembers input:checked");
    return Array.from(checked).map(checkbox => Number(checkbox.value));
}

// Updates the number between the brackets
function updateRentCount() {
    document.getElementById("rentCount").textContent = getSelectedRoomies().length;
}

// Events

document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", showTab);
});
showRentMembers();