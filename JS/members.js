const MEMBERS_PAGE_URL = "http://localhost:8080/CoHabitAPI/api/roomshares/members";
const MEMBERS_PAGE_JOIN_URL = "http://localhost:8080/CoHabitAPI/api/roomshares/join-requests";

// The roomie the owner is about to remove (null when the pop-up is closed)
let memberToRemove = null;

//-------------- API calls -----------------

async function fetchRoomshareMembers() {
    // TODO: remove the email when the session system is available
    const response = await fetch(MEMBERS_PAGE_URL + "?email=" + encodeURIComponent(user.email), {
        credentials: "include"
    });

    if (!response.ok) {
        const error = new Error(`Response status: ${response.status}`)
        error.status = response.status;
        throw error;
    }

    const result = await response.json();
    return result.members;
}

async function fetchJoinRequests() {
    // TODO: remove the email when the session system is available
    const response = await fetch(MEMBERS_PAGE_JOIN_URL + "?ownerEmail=" + encodeURIComponent(user.email), {
        credentials: "include"
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();
    return result.joinRequests;
}

// accept = true to accept the roomie, false to refuse him
async function sendJoinAnswer(roomieId, accept) {
    const response = await fetch(MEMBERS_PAGE_JOIN_URL + "/" + roomieId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        // TODO: remove ownerEmail when the session system is available
        body: JSON.stringify({ ownerEmail: user.email, accept: accept })
    });

    if (!response.ok) {
        const error = new Error(`Response status: ${response.status}`);
        error.status = response.status;
        throw error;
    }
}

// The roomie leaves the roomshare, his account is kept
async function sendMemberRemoval(roomieId) {
    // TODO: remove ownerEmail when the session system is available
    const response = await fetch(MEMBERS_PAGE_URL + "/" + roomieId + "?ownerEmail=" + encodeURIComponent(user.email), {
        method: "DELETE",
        credentials: "include"
    });

    if (!response.ok) {
        const error = new Error(`Response status: ${response.status}`);
        error.status = response.status;
        throw error;
    }
}

//-------------- Helpers -----------------

function createMemberElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }
    if (text !== undefined) {
        element.textContent = text;
    }
    return element;
}

function showMemberMessage(elementId, text) {
    const element = document.getElementById(elementId);
    element.textContent = text;
    element.hidden = false;
}

function hideMemberMessage(elementId) {
    document.getElementById(elementId).hidden = true;
}

// "Alice Doe" => "AD" (no crash if a name is empty)
function getMemberInitials(firstName, lastName) {
    return ((firstName?.[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase();
}

function getMemberFullName(person) {
    return person.firstName + " " + person.lastName;
}

//-------------- Members -----------------

function createMemberItem(member) {
    const item = createMemberElement("li", "member-item");

    const avatarClass = member.role === "owner" ? "member-avatar member-avatar-owner" : "member-avatar";
    const avatar = createMemberElement("span", avatarClass, getMemberInitials(member.firstName, member.lastName));

    const nameRow = createMemberElement("div", "member-name-row");
    nameRow.appendChild(createMemberElement("strong", "member-name", getMemberFullName(member)));

    if (member.id === user.id_person) {
        nameRow.appendChild(createMemberElement("span", "member-badge", "Me"));
    }
    if (member.role === "owner") {
        nameRow.appendChild(createMemberElement("span", "member-badge", "Owner"));
    }

    const main = createMemberElement("div", "member-main");
    main.appendChild(nameRow);
    main.appendChild(createMemberElement("span", "member-meta", member.email));

    item.append(avatar, main);

    // Display only: the API checks that the caller is the owner
    if (user.role === "owner" && member.role === "roomie") {
        const actions = createMemberElement("div", "member-actions");
        const removeButton = createMemberElement("button", "btn-remove", "Remove");
        removeButton.type = "button";
        removeButton.addEventListener("click", () => openRemoveModal(member));
        actions.appendChild(removeButton);
        item.appendChild(actions);
    }

    return item;
}

function showMembers(members) {
    const list = document.getElementById("memberItems");
    list.replaceChildren();

    members.forEach(member => list.appendChild(createMemberItem(member)));

    document.getElementById("memberCount").textContent = members.length;
}

async function loadMembers() {
    try {
        const members = await fetchRoomshareMembers();
        hideMemberMessage("membersMessage");
        showMembers(members);
    } catch (e) {
        console.error(e.message);
        if(user.role === "roomie" && e.status === 403){
            alert("You are not a member of this roomshare anymore. Please sign in again.");
            signOut();
        }else{
            showMemberMessage("membersMessage", "Unable to load the members right now.");
        }
    }
}

//-------------- Join requests (owner) -----------------

function createRequestItem(request) {
    const item = createMemberElement("li", "member-item member-pending");

    const avatar = createMemberElement("span", "member-avatar member-avatar-pending",
        getMemberInitials(request.firstName, request.lastName));

    const main = createMemberElement("div", "member-main");
    main.appendChild(createMemberElement("strong", "member-name", getMemberFullName(request)));
    main.appendChild(createMemberElement("span", "member-meta", request.email));

    const actions = createMemberElement("div", "member-actions");

    const acceptButton = createMemberElement("button", "btn-accept", "✓ Accept");
    acceptButton.type = "button";
    acceptButton.addEventListener("click", () => answerRequest(request.roomieId, true));

    const refuseButton = createMemberElement("button", "btn-refuse", "✕ Refuse");
    refuseButton.type = "button";
    refuseButton.addEventListener("click", () => answerRequest(request.roomieId, false));

    actions.append(acceptButton, refuseButton);
    item.append(avatar, main, actions);
    return item;
}

function showRequests(requests) {
    const list = document.getElementById("pendingItems");
    list.replaceChildren();

    requests.forEach(request => list.appendChild(createRequestItem(request)));

    document.getElementById("pendingCount").textContent = requests.length;
    document.getElementById("pendingEmpty").hidden = requests.length > 0;
}

async function loadRequests() {
    try {
        const requests = await fetchJoinRequests();
        hideMemberMessage("pendingMessage");
        showRequests(requests);
    } catch (e) {
        console.error(e.message);
        showMemberMessage("pendingMessage", "Unable to load the join requests right now.");
    }
}

async function answerRequest(roomieId, accept) {
    hideMemberMessage("pendingMessage");

    try {
        await sendJoinAnswer(roomieId, accept);
        await loadRequests();
        await loadMembers();
    } catch (e) {
        console.error(e.message);

        let message = "Unable to answer the request right now.";
        if (e.status === 404) {
            message = "This request does not exist anymore.";
        } else if (e.status === 409) {
            message = "This request was already answered.";
        }

        // 404 / 409: the lists are out of date, reload them before showing the message
        if (e.status === 404 || e.status === 409) {
            await loadRequests();
            await loadMembers();
        }
        showMemberMessage("pendingMessage", message);
    }
}

//-------------- Remove a roomie (owner) -----------------

function openRemoveModal(member) {
    memberToRemove = member;

    document.getElementById("removeInitials").textContent = getMemberInitials(member.firstName, member.lastName);
    document.getElementById("removeName").textContent = getMemberFullName(member);
    document.getElementById("removeText").textContent =
        member.firstName + " will leave the roomshare and will lose access to its tasks, expenses and calendar.";

    document.getElementById("removeModal").hidden = false;
    document.getElementById("cancelRemove").focus();
}

function closeRemoveModal() {
    memberToRemove = null;
    document.getElementById("removeModal").hidden = true;
}

async function confirmRemove() {
    if (!memberToRemove) {
        return;
    }

    const roomieId = memberToRemove.id;
    closeRemoveModal();

    let message = "";
    try {
        await sendMemberRemoval(roomieId);
    } catch (e) {
        console.error(e.message);
        message = e.status === 404
            ? "This roomie is not a member of the roomshare anymore."
            : "Unable to remove this roomie right now.";
    }

    await loadMembers();

    // Shown after the reload, otherwise loadMembers would hide it
    if (message !== "") {
        showMemberMessage("membersMessage", message);
    }
}

//-------------- Start -----------------

loadMembers();

// app.js removes the owner blocks (data-role="owner") for a roomie
if (document.querySelector(".members-pending")) {
    loadRequests();
}

const memberRemoveModal = document.getElementById("removeModal");

if (memberRemoveModal) {
    document.getElementById("cancelRemove").addEventListener("click", closeRemoveModal);
    document.getElementById("confirmRemove").addEventListener("click", confirmRemove);

    // Click on the dark background closes the pop-up
    memberRemoveModal.addEventListener("click", event => {
        if (event.target === memberRemoveModal) {
            closeRemoveModal();
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !memberRemoveModal.hidden) {
            closeRemoveModal();
        }
    });
}