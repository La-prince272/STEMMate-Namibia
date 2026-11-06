
/* ============================================
   app.js
   STEMMate Namibia - shared functionality
   ============================================ */


// ============================================
// SHORTCUTS
// ============================================

function byId(id) {
    return document.getElementById(id);
}


function byClass(className) {
    return document.querySelector(className);
}


function byClassAll(className) {
    return Array.from(document.querySelectorAll(className));
}


function makeId() {

    return Date.now().toString(36) +
        Math.random().toString(36).substring(2, 8);
}


function currentTime() {
    return new Date().toISOString();
}


// ============================================
// STORAGE KEYS
// ============================================

var KEY_ACTIVITIES = "stemmate.activities";
var KEY_PLANS = "stemmate.plans";
var KEY_QUEUE = "stemmate.syncQueue";
var KEY_KITS = "stemmate.kits";
var KEY_RETURNS = "stemmate.returns";
var KEY_NOTES = "stemmate.notes";


// ============================================
// LOCAL STORAGE
// ============================================

function loadFromStorage(key, defaultValue) {

    var storedData = localStorage.getItem(key);

    return planLogic.parseStoredData(
        storedData,
        defaultValue
    );
}


function saveToStorage(key, value) {

    try {

        var text = JSON.stringify(value);

        localStorage.setItem(key, text);

        return true;

    } catch (err) {

        console.error("Could not save " + key, err);

        return false;
    }
}


// ============================================
// LOCAL CHANGES
// ============================================

function getQueue() {

    var queue = loadFromStorage(KEY_QUEUE, []);

    return Array.isArray(queue) ? queue : [];
}


function saveQueue(queue) {

    return saveToStorage(KEY_QUEUE, queue);
}


// Add a new local change or update an existing record.
// referenceId connects the change to its saved record.

function addToQueue(kind, label, referenceId) {

    var queue = getQueue();


    // Avoid duplicate records for the same item.

    if (referenceId) {

        for (var i = 0; i < queue.length; i++) {

            if (queue[i].referenceId === referenceId) {

                queue[i].label = label;

                queue[i].kind = kind;

                queue[i].status = "pending";


                var updated = saveQueue(queue);

                if (updated) {

                    document.dispatchEvent(
                        new Event("queueChanged")
                    );
                }

                return updated;
            }
        }
    }


    // Create a new local change record.

    var newItem = {

        id: makeId(),

        kind: kind,

        label: label,

        referenceId: referenceId || null,

        status: "pending",

        createdAt: currentTime(),

        attempts: 0
    };


    queue.push(newItem);


    var saved = saveQueue(queue);


    if (saved) {

        document.dispatchEvent(
            new Event("queueChanged")
        );
    }


    return saved;
}


// Remove local change records connected to a deleted
// or incomplete draft plan.

function removeFromQueue(referenceId) {

    var queue = getQueue();

    var remaining = [];


    for (var i = 0; i < queue.length; i++) {

        if (queue[i].referenceId !== referenceId) {

            remaining.push(queue[i]);
        }
    }


    var saved = saveQueue(remaining);


    if (saved) {

        document.dispatchEvent(
            new Event("queueChanged")
        );
    }


    return saved;
}


// Count recorded local changes.

function countUnsyncedItems() {

    var queue = getQueue();

    var count = 0;


    for (var i = 0; i < queue.length; i++) {

        if (queue[i].status === "pending" ||
            queue[i].status === "failed") {

            count++;
        }
    }


    return count;
}


// ============================================
// DISPLAYING LOCAL CHANGES
// ============================================

function showQueue() {

    var container = byClass("#sync-queue .sync-list");

    if (container === null) {
        return;
    }


    container.replaceChildren();


    var queue = getQueue();


    // Display an empty state.

    if (queue.length === 0) {

        var emptyState = document.createElement("div");

        emptyState.className = "state";


        var heading = document.createElement("h3");

        heading.textContent = "No local changes";


        var paragraph = document.createElement("p");

        paragraph.textContent =
            "Changes you save will appear here.";


        emptyState.appendChild(heading);

        emptyState.appendChild(paragraph);

        container.appendChild(emptyState);

        return;
    }


    // Display each recorded change.

    for (var i = 0; i < queue.length; i++) {

        var item = queue[i];


        var row = document.createElement("div");

        row.className = "sync-item";


        var icon = document.createElement("span");

        icon.className = "sync-icon";

        icon.textContent = "✓";


        var information = document.createElement("div");


        var title = document.createElement("p");

        title.className = "title";

        title.textContent = item.label || "Unnamed change";


        var meta = document.createElement("p");

        meta.className = "meta";

        meta.textContent = item.kind || "Local change";


        information.appendChild(title);

        information.appendChild(meta);


        var status = document.createElement("span");

        status.className = "pill pill--ok";

        status.textContent = "Recorded locally";


        row.appendChild(icon);

        row.appendChild(information);

        row.appendChild(status);


        container.appendChild(row);
    }
}


// ============================================
// APPLICATION MESSAGES
// ============================================

function showAppMessage(message, type) {

    var area = byId("app-message");

    if (area === null) {
        return;
    }


    area.textContent = message;


    area.setAttribute(
        "role",
        type === "error" ? "alert" : "status"
    );
}


// ============================================
// CONNECTION BANNER
// ============================================

// This banner reports internet connectivity only.
// It does not represent server synchronisation.

function updateBanner() {

    var banner = byClass(".conn-banner");

    if (banner === null) {
        return;
    }


    var online = navigator.onLine;


    banner.classList.toggle(
        "conn-banner--online",
        online
    );

    banner.classList.toggle(
        "conn-banner--offline",
        !online
    );


    banner.replaceChildren();


    var icon = document.createElement("span");

    icon.textContent = online ? "✓" : "!";


    var message = document.createElement("span");


    if (online) {

        message.textContent =
            "Your device is connected to the internet.";

    } else {

        message.textContent =
            "Your device is offline. You can continue saving changes on this device.";
    }


    banner.appendChild(icon);

    banner.appendChild(message);
}


// ============================================
// EXPORTING LOCAL DATA
// ============================================

function exportLocalData() {

    var backup = {

        application: "STEMMate Namibia",

        exportedAt: currentTime(),

        plans: loadFromStorage(KEY_PLANS, []),

        activities: loadFromStorage(KEY_ACTIVITIES, []),

        syncQueue: getQueue()
    };


    try {

        var json = JSON.stringify(backup, null, 4);


        var file = new Blob(
            [json],
            { type: "application/json" }
        );


        var url = URL.createObjectURL(file);


        var link = document.createElement("a");

        link.href = url;

        link.download = "stemmate-backup.json";


        document.body.appendChild(link);

        link.click();

        link.remove();


        URL.revokeObjectURL(url);


        showAppMessage(
            "Your local data export has been created.",
            "success"
        );

    } catch (err) {

        console.error("Export failed", err);


        showAppMessage(
            "The data export could not be created.",
            "error"
        );
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

                links[i].setAttribute(
                    "aria-current",
                    "page"
                );

            } else {

                links[i].removeAttribute("aria-current");
            }
        }
    }


    highlightActive();


    window.addEventListener(
        "hashchange",
        highlightActive
    );
}


// ============================================
// START SHARED FUNCTIONALITY
// ============================================

window.addEventListener("load", function () {

    updateBanner();

    showQueue();


    // Monitor device connectivity.

    window.addEventListener("online", function () {

        updateBanner();
    });


    window.addEventListener("offline", function () {

        updateBanner();
    });


    // Refresh the local changes display whenever
    // a change is added or removed.

    document.addEventListener("queueChanged", function () {

        showQueue();

    });


    // Handle data export.

    document.addEventListener("click", function (event) {

        var target = event.target;


        if (target.closest === undefined) {
            return;
        }


        var button = target.closest("button");

        if (button === null) {
            return;
        }


        if (button.hasAttribute("data-export")) {

            exportLocalData();
        }
    });


    setupLoginPage();

});
