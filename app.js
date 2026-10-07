/* ============================================
   app.js
   STEMMate Namibia - makes the pages work
   I wrote this to add some interactivity.
   It uses localStorage to remember things
   and pretends to sync when online.
   ============================================ */

// ---------- SHORTCUTS ----------

// Shorthand for document.getElementById
function byId(id) {
    return document.getElementById(id);
}

// Shorthand for document.querySelector
function byClass(className) {
    return document.querySelector(className);
}

// Shorthand for document.querySelectorAll (returns array)
function byClassAll(className) {
    var list = document.querySelectorAll(className);
    var arr = [];
    for (var i = 0; i < list.length; i++) {
        arr.push(list[i]);
    }
    return arr;
}

// Make a random id for new items
function makeId() {
    return Math.random().toString(36).substring(2, 10);
}

// Get the current time as a string
function currentTime() {
    var d = new Date();
    return d.toISOString();
}


// ============================================
// STORAGE KEYS
// I put all the names here so I don't
// accidentally misspell them somewhere.
// ============================================

var KEY_ACTIVITIES = "stemmate.activities";
var KEY_PLANS = "stemmate.plans";
var KEY_QUEUE = "stemmate.syncQueue";
var KEY_KITS = "stemmate.kits";
var KEY_RETURNS = "stemmate.returns";
var KEY_NOTES = "stemmate.notes";


// ============================================
// READING AND WRITING TO LOCALSTORAGE
// ============================================

function loadFromStorage(key, defaultValue) {
    var raw = localStorage.getItem(key);
    if (raw === null) {
        return defaultValue;
    }
    try {
        return JSON.parse(raw);
    } catch (err) {
        console.log("Could not read " + key + ": " + err);
        return defaultValue;
    }
}

function saveToStorage(key, value) {
    try {
        var text = JSON.stringify(value);
        localStorage.setItem(key, text);
    } catch (err) {
        console.log("Could not save " + key + ": " + err);
    }
}


// ============================================
// THE SYNC QUEUE
// Every change gets added to a list.
// When we are online, we try to send them.
// ============================================

function getQueue() {
    return loadFromStorage(KEY_QUEUE, []);
}

function saveQueue(queue) {
    saveToStorage(KEY_QUEUE, queue);
}

function addToQueue(kind, label) {
    var queue = getQueue();

    var newItem = {
        id: makeId(),
        kind: kind,
        label: label,
        status: "pending",
        createdAt: currentTime(),
        attempts: 0
    };

    queue.push(newItem);
    saveQueue(queue);

    // Tell the banner to update
    var event = new Event("queueChanged");
    document.dispatchEvent(event);
}

// Just counts pending + failed items
function countUnsyncedItems() {
    var queue = getQueue();
    var count = 0;
    for (var i = 0; i < queue.length; i++) {
        if (queue[i].status === "pending" || queue[i].status === "failed") {
            count = count + 1;
        }
    }
    return count;
}


// ============================================
// SHOWING THE QUEUE ON THE PAGE
// ============================================

function showQueue() {
    var container = byClass("#sync-queue .sync-list");
    if (container === null) {
        return;
    }

    var queue = getQueue();

    if (queue.length === 0) {
        container.innerHTML =
            '<div class="state">' +
            '<h3>All synced</h3>' +
            '<p>There are no pending changes on this device.</p>' +
            '</div>';
        return;
    }

    var html = "";

    for (var i = 0; i < queue.length; i++) {
        var item = queue[i];

        var pillHtml = "";
        if (item.status === "pending") {
            pillHtml = '<span class="pill pill--warn">Pending</span>';
        } else if (item.status === "failed") {
            pillHtml = '<span class="pill pill--danger">Failed</span>';
        } else {
            pillHtml = '<span class="pill pill--ok">Synced</span>';
        }

        var retryButton = "";
        if (item.status === "failed") {
            retryButton = '<button type="button" class="btn btn-small" data-retry="' + item.id + '">Retry</button>';
        }

        var icon = "&#8635;";
        if (item.status === "failed") {
            icon = "&#9888;";
        }

        html = html +
            '<div class="sync-item" data-id="' + item.id + '">' +
            '  <span class="sync-icon">' + icon + '</span>' +
            '  <div>' +
            '    <p class="title">' + item.label + '</p>' +
            '    <p class="meta">' + item.kind + '</p>' +
            '  </div>' +
            pillHtml +
            '  <div class="actions">' + retryButton + '</div>' +
            '</div>';
    }

    container.innerHTML = html;
}


// ============================================
// THE CONNECTION BANNER
// Shows "you are online" or "you are offline"
// ============================================

function updateBanner() {
    var banner = byClass(".conn-banner");
    if (banner === null) {
        return;
    }

    var online = navigator.onLine;
    var count = countUnsyncedItems();

    if (online) {
        banner.classList.remove("conn-banner--offline");
        banner.classList.add("conn-banner--online");
    } else {
        banner.classList.remove("conn-banner--online");
        banner.classList.add("conn-banner--offline");
    }

    var message = "";

    if (online) {
        if (count > 0) {
            message = "You are online. " + count + " change(s) ready to sync.";
        } else {
            message = "You are online. Everything is up to date.";
        }
    } else {
        if (count > 0) {
            message = "You are offline. " + count + " change(s) waiting to sync.";
        } else {
            message = "You are offline. Changes will be saved on this device.";
        }
    }

    var icon = "&#10003;"; // tick
    if (online === false) {
        icon = "&#9888;";  // warning
    }

    banner.innerHTML = '<span>' + icon + '</span><span>' + message + '</span>';

    // If there are pending items, add a link to the queue
    if (count > 0) {
        var link = document.createElement("a");
        link.className = "btn btn-small";
        link.href = "#sync-queue";
        link.textContent = "View queue";
        link.style.marginLeft = "auto";
        banner.appendChild(link);
    }
}


// ============================================
// PRETENDING TO SYNC
// We don't have a real server so I just
// wait a bit and then pretend it worked.
// 85% of the time it works.
// ============================================

function pretendToUpload(item, callback) {
    setTimeout(function () {
        var roll = Math.random();
        if (roll < 0.85) {
            callback(true);
        } else {
            callback(false);
        }
    }, 700);
}

function syncEverything() {
    if (navigator.onLine === false) {
        // Not online, nothing to do
        return;
    }

    var queue = getQueue();

    if (queue.length === 0) {
        return;
    }

    // Only process pending ones
    var toSync = [];
    for (var i = 0; i < queue.length; i++) {
        if (queue[i].status !== "done") {
            toSync.push(queue[i]);
        }
    }

    if (toSync.length === 0) {
        return;
    }

    // Do them one after another
    syncNextItem(toSync, 0, queue);
}

function syncNextItem(items, index, queue) {
    if (index >= items.length) {
        // All done - remove the successful ones
        var remaining = [];
        for (var i = 0; i < queue.length; i++) {
            if (queue[i].status !== "done") {
                remaining.push(queue[i]);
            }
        }
        saveQueue(remaining);
        showQueue();
        updateBanner();
        return;
    }

    var item = items[index];

    pretendToUpload(item, function (success) {
        // Find this item in the main queue and update it
        for (var i = 0; i < queue.length; i++) {
            if (queue[i].id === item.id) {
                if (success) {
                    queue[i].status = "done";
                } else {
                    queue[i].status = "failed";
                }
                queue[i].attempts = queue[i].attempts + 1;
            }
        }

        saveQueue(queue);
        showQueue();
        updateBanner();

        // Move to the next one
        syncNextItem(items, index + 1, queue);
    });
}


// ============================================
// FACILITATOR PAGE
// ============================================

function setupFacilitatorPage() {
    var planForm = byClass(".session-creation form");
    if (planForm === null) {
        return;
    }

    setupActivityFilter();
    setupActivityButtons();
    setupPlanForm(planForm);
    showPlans();
}

function setupActivityFilter() {
    var section = byClass(".activity-filtering");
    if (section === null) {
        return;
    }

    var applyButton = section.querySelector(".btn-primary");
    if (applyButton === null) {
        return;
    }

    applyButton.onclick = function (event) {
        event.preventDefault();

        var level = byId("level").value;
        var topic = byId("topic").value;
        var duration = byId("time-availability").value;
        var material = byId("materials-used").value;

        var cards = byClassAll(".activity-card");
        var shown = 0;

        for (var i = 0; i < cards.length; i++) {
            var card = cards[i];
            var text = card.textContent.toLowerCase();

            var matches = true;

            // Check level
            if (level.indexOf("Any") === -1) {
                if (text.indexOf(level.toLowerCase()) === -1) {
                    matches = false;
                }
            }

            // Check topic
            if (topic.indexOf("Any") === -1) {
                if (text.indexOf(topic.toLowerCase()) === -1) {
                    matches = false;
                }
            }

            // Check material
            if (material.indexOf("Any") === -1) {
                if (text.indexOf(material.toLowerCase()) === -1) {
                    matches = false;
                }
            }

            if (matches === true) {
                card.hidden = false;
                shown = shown + 1;
            } else {
                card.hidden = true;
            }
        }

        var status = section.querySelector(".hint");
        if (status !== null) {
            status.innerHTML = "Showing <b>" + shown + "</b> activities.";
        }
    };
}

function setupActivityButtons() {
    document.onclick = function (event) {
        var button = event.target;

        // Only care about buttons
        if (button.tagName !== "BUTTON") {
            return;
        }

        var card = button.closest(".activity-card");

        // -------- Save offline button --------
        if (button.textContent.trim() === "Save offline" && card !== null) {
            var title = card.querySelector("h3").textContent;

            // Save it to localStorage
            var activities = loadFromStorage(KEY_ACTIVITIES, []);

            var alreadySaved = false;
            for (var i = 0; i < activities.length; i++) {
                if (activities[i].title === title) {
                    alreadySaved = true;
                }
            }

            if (alreadySaved === false) {
                activities.push({
                    id: makeId(),
                    title: title,
                    savedAt: currentTime()
                });
                saveToStorage(KEY_ACTIVITIES, activities);
            }

            // Change the pill and disable the button
            var pills = card.querySelectorAll("p");
            if (pills.length > 0) {
                var lastP = pills[pills.length - 1];
                lastP.innerHTML = '<span class="pill pill--ok">Saved offline</span>';
            }
            button.disabled = true;
            button.textContent = "Saved";

            // Add to sync queue
            addToQueue("Save activity", title);
            showQueue();
            updateBanner();
        }

        // -------- Plan this activity button --------
        if (button.textContent.trim() === "Plan this activity" && card !== null) {
            var cardTitle = card.querySelector("h3").textContent;
            var nameInput = byId("sessionName");

            if (nameInput !== null) {
                nameInput.value = cardTitle;
                nameInput.focus();
                nameInput.scrollIntoView();
            }
        }

        // -------- Retry button in the queue --------
        var retryId = button.getAttribute("data-retry");
        if (retryId !== null) {
            var queue = getQueue();
            for (var j = 0; j < queue.length; j++) {
                if (queue[j].id === retryId) {
                    queue[j].status = "pending";
                    queue[j].attempts = queue[j].attempts + 1;
                }
            }
            saveQueue(queue);
            showQueue();
            updateBanner();
        }

        // -------- Sync all button --------
        if (button.hasAttribute("data-sync-all")) {
            syncEverything();
        }
    };
}

function setupPlanForm(form) {
    form.onsubmit = function (event) {
        event.preventDefault();

        var name = byId("sessionName").value;
        name = name.trim();

        if (name === "") {
            alert("Please enter a session name.");
            byId("sessionName").focus();
            return false;
        }

        // Build the plan object
        var plan = {
            id: makeId(),
            name: name,
            date: byId("sessionDate").value,
            duration: byId("sessionTime").value,
            topic: byId("sessionTopic").value,
            steps: byId("sessionSteps").value,
            materials: byId("sessionMaterials").value,
            safety: byId("sessionSafetyNotes").value,
            inclusion: byId("inclusionPrompts").value,
            status: "pending",
            savedAt: currentTime()
        };

        // Save to localStorage
        var plans = loadFromStorage(KEY_PLANS, []);
        plans.push(plan);
        saveToStorage(KEY_PLANS, plans);

        // Add to sync queue
        addToQueue("Session plan", name);
        showPlans();
        showQueue();
        updateBanner();

        // Show a message
        var msg = document.createElement("p");
        msg.className = "hint";
        msg.innerHTML = 'Draft saved. <span class="pill pill--warn">Queued for sync</span>';
        form.appendChild(msg);

        // Reset the form
        form.reset();
    };

    // Find the "Save draft" button (the second button)
    var buttons = form.querySelectorAll("button");
    for (var i = 0; i < buttons.length; i++) {
        if (buttons[i].type === "button") {
            buttons[i].onclick = function () {
                var name = byId("sessionName").value.trim();
                if (name === "") {
                    name = "Untitled draft";
                }

                var plans = loadFromStorage(KEY_PLANS, []);
                plans.push({
                    id: makeId(),
                    name: name,
                    status: "draft",
                    savedAt: currentTime()
                });
                saveToStorage(KEY_PLANS, plans);
                showPlans();
            };
        }
    }
}

function showPlans() {
    var host = byClass(".modify-delete");
    if (host === null) {
        return;
    }

    // Remove any old dynamic plans first
    var oldRows = host.querySelectorAll("[data-dynamic]");
    for (var i = 0; i < oldRows.length; i++) {
        oldRows[i].parentNode.removeChild(oldRows[i]);
    }

    var plans = loadFromStorage(KEY_PLANS, []);

    // Show the newest first
    var reversed = plans.slice().reverse();

    for (var j = 0; j < reversed.length; j++) {
        var plan = reversed[j];

        var row = document.createElement("div");
        row.className = "plan-row";
        row.setAttribute("data-dynamic", "true");

        var statusHtml = "";
        if (plan.status === "draft") {
            statusHtml = '<span class="pill pill--draft">Draft</span>';
        } else {
            statusHtml = '<span class="pill pill--warn">Pending sync</span>';
        }

        var dateText = plan.date;
        if (!dateText) {
            dateText = "No date";
        }
        var durationText = plan.duration;
        if (!durationText) {
            durationText = "No duration";
        }

        row.innerHTML =
            '<div>' +
            '  <p class="title">' + plan.name + '</p>' +
            '  <p class="meta">' + dateText + ' - ' + durationText + '</p>' +
            '</div>' +
            '<div>' + statusHtml + '</div>' +
            '<div class="actions">' +
            '  <button type="button" class="btn" data-edit="' + plan.id + '">Modify</button>' +
            '  <button type="button" class="btn btn-danger" data-del="' + plan.id + '">Delete</button>' +
            '</div>';

        host.appendChild(row);
    }

    // Delete button handler
    host.onclick = function (event) {
        var target = event.target;
        var id = target.getAttribute("data-del");

        if (id === null) {
            return;
        }

        var sure = confirm("Delete this session plan? This cannot be undone.");
        if (sure === false) {
            return;
        }

        var plans = loadFromStorage(KEY_PLANS, []);
        var kept = [];
        for (var i = 0; i < plans.length; i++) {
            if (plans[i].id !== id) {
                kept.push(plans[i]);
            }
        }
        saveToStorage(KEY_PLANS, kept);
        showPlans();
    };
}


// ============================================
// CUSTODIAN PAGE
// ============================================

function setupCustodianPage() {
    var tableBody = byClass("table.kits tbody");
    if (tableBody === null) {
        return;
    }

    var bookingForm = byClass(".kit-booking form");
    var returnForm = byClass(".kit-return form");

    if (bookingForm !== null) {
        bookingForm.onsubmit = function (event) {
            event.preventDefault();

            var kit = byId("book-kit").value;
            var date = byId("book-date").value;
            var person = byId("book-person").value.trim();

            if (kit === "" || date === "" || person === "") {
                alert("Please fill in kit, date and responsible person.");
                return false;
            }

            // Look for an existing booking of the same kit on the same date
            var rows = tableBody.querySelectorAll("tr");
            var conflict = false;

            for (var i = 0; i < rows.length; i++) {
                var cells = rows[i].querySelectorAll("td");
                if (cells.length >= 3) {
                    var cellKit = cells[0].textContent.trim();
                    var cellDate = cells[2].textContent.trim();
                    if (cellKit === kit && cellDate === date) {
                        conflict = true;
                    }
                }
            }

            if (conflict === true) {
                alert("Conflict: " + kit + " is already booked on " + date + ".");
                return false;
            }

            // Add a new row to the table
            var newRow = document.createElement("tr");
            newRow.innerHTML =
                "<td>" + kit + "</td>" +
                "<td>-</td>" +
                "<td>" + date + "</td>" +
                "<td>" + person + "</td>" +
                '<td><span class="pill pill--draft">Reserved</span></td>' +
                '<td><button type="button" class="btn btn-small">Check out</button></td>';

            tableBody.appendChild(newRow);

            addToQueue("Kit reservation", kit + " - " + person);
            showQueue();
            updateBanner();

            bookingForm.reset();
            return false;
        };
    }

    if (returnForm !== null) {
        returnForm.onsubmit = function (event) {
            event.preventDefault();

            var kit = byId("return-kit").value;
            var condition = byId("return-condition").value;

            if (kit === "") {
                alert("Please select a kit.");
                return false;
            }

            addToQueue("Kit return", kit + " (" + condition + ")");
            showQueue();
            updateBanner();

            var note = document.createElement("p");
            note.className = "hint";
            note.innerHTML = 'Return recorded. <span class="pill pill--warn">Queued for sync</span>';
            returnForm.appendChild(note);

            returnForm.reset();
            return false;
        };
    }
}


// ============================================
// ASSISTANT PAGE
// ============================================

function setupAssistantPage() {
    var saveButton = byClass(".session-notes .btn-primary");
    if (saveButton === null) {
        return;
    }

    saveButton.onclick = function () {
        var body = byId("notes-body").value;
        body = body.trim();

        if (body === "") {
            alert("Please write a note first.");
            return;
        }

        var notes = loadFromStorage(KEY_NOTES, []);
        notes.push({
            id: makeId(),
            body: body,
            savedAt: currentTime()
        });
        saveToStorage(KEY_NOTES, notes);

        addToQueue("Assistant note", body.substring(0, 40));
        showQueue();
        updateBanner();

        saveButton.textContent = "Saved";
        saveButton.disabled = true;

        setTimeout(function () {
            saveButton.textContent = "Save note to this plan";
            saveButton.disabled = false;
        }, 2000);
    };

    // Checkboxes fade their row when ticked
    var checkboxes = byClassAll(".checklist--interactive input[type=checkbox]");
    for (var i = 0; i < checkboxes.length; i++) {
        var cb = checkboxes[i];
        cb.onchange = function () {
            var li = this.closest("li");
            if (this.checked) {
                li.style.opacity = "0.6";
            } else {
                li.style.opacity = "1";
            }
        };
    }
}


// ============================================
// SCHOOL MANAGEMENT PAGE
// ============================================

function setupManagementPage() {
    var applyButton = byClass(".card .btn-primary");
    if (applyButton === null) {
        return;
    }

    applyButton.onclick = function (event) {
        event.preventDefault();

        var level = byId("m-level").value;
        var topic = byId("m-topic").value;

        var rows = byClassAll(".management-list .plan-row");
        var shown = 0;

        for (var i = 0; i < rows.length; i++) {
            var text = rows[i].textContent.toLowerCase();
            var matches = true;

            if (level.indexOf("Any") === -1) {
                if (text.indexOf(level.toLowerCase()) === -1) {
                    matches = false;
                }
            }

            if (topic.indexOf("Any") === -1) {
                if (text.indexOf(topic.toLowerCase()) === -1) {
                    matches = false;
                }
            }

            if (matches === true) {
                rows[i].hidden = false;
                shown = shown + 1;
            } else {
                rows[i].hidden = true;
            }
        }

        var status = byClass(".management-list .hint");
        if (status !== null) {
            status.innerHTML = "Showing <b>" + shown + "</b> plan(s).";
        }
    };

    // "Mark as reviewed" button
    var previewButton = byClass(".management-preview .btn");
    if (previewButton !== null) {
        previewButton.onclick = function () {
            var pill = byClass(".management-preview .pill");
            if (pill !== null) {
                pill.className = "pill pill--ok";
                pill.textContent = "Reviewed";
            }
        };
    }
}


// ============================================
// LOGIN PAGE
// ============================================

function setupLoginPage() {
    var picker = byClass(".role-picker");
    if (picker === null) {
        return;
    }

    function highlightActive() {
        var hash = window.location.hash;
        var links = picker.querySelectorAll("a");

        for (var i = 0; i < links.length; i++) {
            if (links[i].hash === hash) {
                links[i].setAttribute("aria-current", "page");
            } else {
                links[i].setAttribute("aria-current", "false");
            }
        }
    }

    highlightActive();
    window.onhashchange = highlightActive;
}


// ============================================
// START EVERYTHING WHEN THE PAGE LOADS
// ============================================

window.onload = function () {

    // Banner and queue are on every page
    updateBanner();
    showQueue();

    // Wire up the buttons on the page (the ones
    // that aren't tied to a single setup function)
    document.addEventListener("click", function (event) {
        var target = event.target;

        // Retry button
        var retryId = target.getAttribute("data-retry");
        if (retryId !== null) {
            var queue = getQueue();
            for (var i = 0; i < queue.length; i++) {
                if (queue[i].id === retryId) {
                    queue[i].status = "pending";
                }
            }
            saveQueue(queue);
            showQueue();
            updateBanner();
        }

        // Sync all button
        if (target.hasAttribute("data-sync-all")) {
            syncEverything();
        }
    });

    // Listen for online/offline changes
    window.addEventListener("online", function () {
        updateBanner();
        syncEverything();
    });

    window.addEventListener("offline", function () {
        updateBanner();
    });

    // Listen for our own "queue changed" event
    document.addEventListener("queueChanged", function () {
        updateBanner();
    });

    // Set up page specific stuff.
    // Only one of these will actually do
    // anything - the rest just return early.
    setupLoginPage();
    setupFacilitatorPage();
    setupCustodianPage();
    setupAssistantPage();
    setupManagementPage();

    // If we're already online, try to push anything waiting
    if (navigator.onLine) {
        syncEverything();
    }
};