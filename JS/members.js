// Members page

// This file shows the members of the roomshare (the owner and the accepted roomies) to everybody,
// and the join requests waiting for an answer to the owner only.
// The logic stays in the model (the API): the front never decides who is a member.
// We only ask the API, we show the answer and we send the choice of the owner (accept or refuse).

// The urls of the API for the members and for the join requests
const MEMBERS_URL = "http://localhost:8080/CoHabitAPI/api/roomshares/members";
const JOIN_REQUESTS_URL = "http://localhost:8080/CoHabitAPI/api/roomshares/join-requests";

// This function is used to ask the API for the members of the roomshare of the user
async function getMembers() {
    // The API does not have a session system yet, so we send the email of the user to say who is asking
    // encodeURIComponent protects the special characters of the email (like @ or +) inside the url
    // TO DO : remove the email when the session system is efficient
    const response = await fetch(MEMBERS_URL + "?email=" + encodeURIComponent(user.email), {
        credentials: "include"   // sends the cookie of the user
    });

    // If the API did not answer with a 2xx code, we stop and the caller shows an error message
    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    // The answer is a JSON like {"members": [ ... ]}, we only keep the list (the owner is the first one)
    const result = await response.json();
    return result.members;
}

// This function is used to ask the API for the join requests waiting for the answer of the owner
async function getJoinRequests() {
    // Same as above: the email says who is asking
    // TO DO : remove the email when the session system is efficient
    const response = await fetch(JOIN_REQUESTS_URL + "?ownerEmail=" + encodeURIComponent(user.email), {
        credentials: "include"
    });

    if (!response.ok) {
        throw new Error(`Response status: ${response.status}`);
    }

    // The answer is a JSON like {"joinRequests": [ ... ]}, we only keep the list
    const result = await response.json();
    return result.joinRequests;
}

// This function is used to send the answer of the owner for one roomie
// accept = true: the roomie is accepted, accept = false: the request is refused
async function sendAnswer(roomieId, accept) {
    // PUT because we change a request that already exists, the id of the roomie is in the url
    const response = await fetch(JOIN_REQUESTS_URL + "/" + roomieId, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },   // we tell the API that we send a JSON
        credentials: "include",                            // same as above: the cookie
        // TO DO : remove ownerEmail when the session system is efficient
        body: JSON.stringify({ ownerEmail: user.email, accept: accept })
    });

    // We keep the code so the page knows why the API refused (404 or 409)
    if (!response.ok) {
        const error = new Error(`Response status: ${response.status}`);
        error.status = response.status;
        throw error;
    }
}

//-------------- Small helpers -----------------
// The names start with "member" so they cannot be mixed up with the helpers of the other pages
// (for example expenses.js also has a createElement function, and all the files share the same page)

// This function is used to create an HTML element in one line
// (tag = the type of element, className = its css class, text = what is written inside)
// textContent is used and not innerHTML: a name like "<script>" is shown as text and never executed
function createMemberElement(tag, className, text) {
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
function showMemberMessage(elementId, text) {
    const element = document.getElementById(elementId);
    element.textContent = text;
    element.hidden = false;       // the paragraph is hidden by default in the html
}

// Hides a message
function hideMemberMessage(elementId) {
    document.getElementById(elementId).hidden = true;
}

// This function returns the initials of a person: "Alice Doe" becomes "AD"
function getInitials(firstName, lastName) {
    return (firstName[0] + lastName[0]).toUpperCase();
}

//-------------- Show the members -----------------
// This function creates ONE line of the list of members
// It receives one member (an object sent by the API) and returns the <li> ready to be added in the page
function createMemberItem(member) {
    const item = createMemberElement("li", "member-item");

    // The round circle with the initials. The owner has another color so we find him quickly
    const avatarClass = member.role === "owner" ? "member-avatar member-avatar-owner" : "member-avatar";
    const avatar = createMemberElement("span", avatarClass, getInitials(member.firstName, member.lastName));

    // The name and the badges are on the same line
    const nameRow = createMemberElement("div", "member-name-row");
    nameRow.appendChild(createMemberElement("strong", "member-name", member.firstName + " " + member.lastName));

    // "Me" when this line is the signed in user (the email is unique, so it finds the right person)
    if (member.email === user.email) {
        nameRow.appendChild(createMemberElement("span", "member-badge", "Me"));
    }
    // "Owner" for the owner of the roomshare (the role is given by the API)
    if (member.role === "owner") {
        nameRow.appendChild(createMemberElement("span", "member-badge", "Owner"));
    }

    // The name line and the email under it
    const main = createMemberElement("div", "member-main");
    main.appendChild(nameRow);
    main.appendChild(createMemberElement("span", "member-meta", member.email));

    item.append(avatar, main);
    return item;
}

// This function shows the list of the members
function showMembers(members) {
    const list = document.getElementById("memberItems");

    // We empty the list first, otherwise the lines would be added twice at each refresh
    list.replaceChildren();

    // One line for each member. The API sends the owner first, so he is just under the title
    members.forEach(member => list.appendChild(createMemberItem(member)));

    // The number of members in the title: "Members of the roomshare (3)"
    document.getElementById("memberCount").textContent = members.length;
}

//-------------- Show the requests (owner) -----------------
// This function creates ONE line of the list of requests
// It receives one request (an object sent by the API) and returns the <li> ready to be added in the page
function createRequestItem(request) {
    const item = createMemberElement("li", "member-item member-pending");

    // The round circle with the initials of the roomie
    const avatar = createMemberElement("span", "member-avatar member-avatar-pending", getInitials(request.firstName, request.lastName));

    // The name and the email
    const main = createMemberElement("div", "member-main");
    main.appendChild(createMemberElement("strong", "member-name", request.firstName + " " + request.lastName));
    main.appendChild(createMemberElement("span", "member-meta", request.email));

    // The two buttons on the right
    const actions = createMemberElement("div", "member-actions");

    const acceptButton = createMemberElement("button", "btn-accept", "✓ Accept");
    acceptButton.type = "button";
    // Each button remembers the id of ITS roomie, so we do not need to keep it in the html
    acceptButton.addEventListener("click", () => answerRequest(request.roomieId, true));

    const refuseButton = createMemberElement("button", "btn-refuse", "✕ Refuse");
    refuseButton.type = "button";
    refuseButton.addEventListener("click", () => answerRequest(request.roomieId, false));

    actions.append(acceptButton, refuseButton);

    item.append(avatar, main, actions);
    return item;
}

// This function shows the list of the requests
function showRequests(requests) {
    const list = document.getElementById("pendingItems");

    // We empty the list first, otherwise the lines would be added twice at each refresh
    list.replaceChildren();

    // One line for each request
    requests.forEach(request => list.appendChild(createRequestItem(request)));

    // The number of requests in the title, like in the mockup: "Waiting for approval (1)"
    document.getElementById("pendingCount").textContent = requests.length;

    // The message "No request" is shown only when the list is empty
    document.getElementById("pendingEmpty").hidden = list.children.length > 0;
}

//-------------- Accept or refuse -----------------
// This function runs when the owner clicks on "Accept" or "Refuse"
async function answerRequest(roomieId, accept) {
    // No old error message
    hideMemberMessage("pendingMessage");

    try {
        await sendAnswer(roomieId, accept);

        // We ask the API again: the roomie disappears from the requests,
        // and if he was accepted he appears in the members
        // We do not move the line ourselves: the lists always show what is really in the db
        await loadRequests();
        await loadMembers();
    } catch (e) {
        console.error(e.message);
        // 404: the request does not exist anymore, 409: it was already answered (for example in another tab)
        let message = "Unable to answer the request right now.";
        if (e.status === 404) {
            message = "This request does not exist anymore.";
        } else if (e.status === 409) {
            message = "This request was already answered.";
        }
        showMemberMessage("pendingMessage", message);

        // In these two cases the lists are not up to date, so we load them again
        if (e.status === 404 || e.status === 409) {
            await loadRequests();
            await loadMembers();
        }
    }
}

//-------------- Start -----------------
// This function asks the API for the members and shows them on the page
// It is used when the page opens and after each answer of the owner
async function loadMembers() {
    try {
        const members = await getMembers();
        hideMemberMessage("membersMessage");     // if there was an error before, we remove it
        showMembers(members);
    } catch (e) {
        console.error(e.message);
        // The message is shown in the page (and not in an alert)
        showMemberMessage("membersMessage", "Unable to load the members right now.");
    }
}

// This function asks the API for the requests and shows them on the page (owner only)
async function loadRequests() {
    try {
        const requests = await getJoinRequests();
        showRequests(requests);
    } catch (e) {
        console.error(e.message);
        showMemberMessage("pendingMessage", "Unable to load the join requests right now.");
    }
}

// Events :
// Everybody (owner and roomies) sees the members, so we always load them
loadMembers();

// app.js removes the block of the requests for a roomie (applyRole), so we load them only when it exists.
// Without this check, the code would crash for a roomie because the elements would not exist
const membersPending = document.querySelector(".members-pending");

if (membersPending) {
    loadRequests();
}