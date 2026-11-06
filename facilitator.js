
/* ============================================
   facilitator.js
   STEMMate Namibia - Facilitator dashboard
   ============================================ */

var editingPlanId = null;


// ============================================
// PAGE INITIALISATION
// ============================================

function setupFacilitatorPage() {

    var form = byClass(".session-creation form");

    if (form === null) {
        return;
    }

    setupActivityFilter();
    setupActivityButtons();
    setupPlanForm(form);
    setupPlanActions();

    showPlans();
    updateDashboardNumbers();
    updateActivityButtons();
}


// ============================================
// SESSION PLAN DATA
// ============================================

function getPlans() {

    var plans = loadFromStorage(KEY_PLANS, []);

    if (Array.isArray(plans) === false) {
        return [];
    }

    return plans;
}


function createPlanFromForm() {

    return {
        id: editingPlanId || planLogic.createPlanId(),

        name: byId("sessionName").value.trim(),

        date: byId("sessionDate").value,

        duration: byId("sessionTime").value,

        topic: byId("sessionTopic").value,

        steps: byId("sessionSteps").value.trim(),

        materials: byId("sessionMaterials").value.trim(),

        safety: byId("sessionSafetyNotes").value.trim(),

        inclusion: byId("inclusionPrompts").value.trim(),

        status: "saved-local",

        createdAt: currentTime(),

        updatedAt: currentTime()
    };
}


// ============================================
// FORM MESSAGES
// ============================================

function showFormMessage(message, type) {

    var form = byClass(".session-creation form");

    if (form === null) {
        return;
    }

    var oldMessage = byId("plan-message");

    if (oldMessage !== null) {
        oldMessage.remove();
    }

    var paragraph = document.createElement("p");

    paragraph.id = "plan-message";
    paragraph.className = "hint";
    paragraph.textContent = message;

    paragraph.setAttribute(
        "role",
        type === "error" ? "alert" : "status"
    );

    form.appendChild(paragraph);
}


// ============================================
// SAVING SESSION PLANS
// ============================================

function saveSessionPlan(isDraft) {

    var name = byId("sessionName").value.trim();

    // Validate submitted plans.
    // Drafts may be incomplete.

    if (!isDraft && !planLogic.validatePlan({

        name: name,

        date: byId("sessionDate").value,

        duration: byId("sessionTime").value,

        topic: byId("sessionTopic").value

    })) {

        showFormMessage(
            "Please complete all required fields.",
            "error"
        );

        return;
    }

    if (name === "") {
        name = "Untitled draft";
    }

    var plans = getPlans();

    var plan = createPlanFromForm();

    plan.name = name;

    if (isDraft) {
        plan.status = "draft";
    }

    // Preserve the original creation date when editing.

    var existingPlan = null;

    for (var i = 0; i < plans.length; i++) {

        if (plans[i].id === plan.id) {

            existingPlan = plans[i];

            plan.createdAt = existingPlan.createdAt;

            break;
        }
    }

    // Add a new plan or update an existing one.
    // This logic is handled by plan-logic.js.

    plans = planLogic.savePlanToList(plans, plan);


    // First save the actual plan.

    if (saveToStorage(KEY_PLANS, plans) === false) {

        showFormMessage(
            "The plan could not be saved. Check your browser storage.",
            "error"
        );

        return;
    }


    // Handle the local changes queue separately.

    var queueSaved = true;

    if (isDraft) {

        // Drafts do not need a queue entry.

        queueSaved = removeFromQueue(plan.id);

    } else {

        // Add or update one queue record for this plan.

        queueSaved = addToQueue(
            "Session plan",
            plan.name,
            plan.id
        );
    }


    // Handle a queue storage failure.

    if (queueSaved === false && isDraft === false) {

        plan.status = "saved-local";

        var latestPlans = getPlans();

        for (var k = 0; k < latestPlans.length; k++) {

            if (latestPlans[k].id === plan.id) {

                latestPlans[k] = plan;
            }
        }

        saveToStorage(KEY_PLANS, latestPlans);

        showFormMessage(
            "The plan was saved locally, but its local changes record could not be saved. Export a backup and check browser storage.",
            "error"
        );

    } else {

        showFormMessage(
            isDraft
                ? "Draft saved on this device."
                : "Plan saved successfully on this device.",
            "success"
        );
    }


    editingPlanId = null;

    showPlans();

    updateDashboardNumbers();

    var form = byClass(".session-creation form");

    if (form !== null) {

        form.reset();

        var submitButton =
            form.querySelector('button[type="submit"]');

        if (submitButton !== null) {
            submitButton.textContent = "Save session plan";
        }
    }
}


// ============================================
// SESSION PLAN FORM
// ============================================

function setupPlanForm(form) {

    form.addEventListener("submit", function (event) {

        event.preventDefault();

        saveSessionPlan(false);
    });


    var draftButton = byId("save-draft");

    if (draftButton !== null) {

        draftButton.addEventListener("click", function () {

            saveSessionPlan(true);
        });
    }


    form.addEventListener("reset", function () {

        editingPlanId = null;

        var submitButton =
            form.querySelector('button[type="submit"]');

        if (submitButton !== null) {
            submitButton.textContent = "Save session plan";
        }
    });
}


// ============================================
// DISPLAYING SESSION PLANS
// ============================================

function showPlans() {

    var host = byClass(".modify-delete");

    if (host === null) {
        return;
    }

    // Remove previously generated plan rows.

    var oldRows = host.querySelectorAll("[data-dynamic]");

    for (var i = 0; i < oldRows.length; i++) {

        oldRows[i].remove();
    }

    var plans = getPlans();

    // Display newest plans first.

    var reversed = plans.slice().reverse();

    if (reversed.length === 0) {

        var emptyMessage = document.createElement("p");

        emptyMessage.className = "hint";

        emptyMessage.setAttribute("data-dynamic", "true");

        emptyMessage.textContent =
            "You have not created any session plans yet.";

        host.appendChild(emptyMessage);

        return;
    }


    for (var j = 0; j < reversed.length; j++) {

        var plan = reversed[j];

        var row = document.createElement("div");

        row.className = "plan-row";

        row.setAttribute("data-dynamic", "true");


        // Plan information.

        var information = document.createElement("div");

        var title = document.createElement("p");

        title.className = "title";

        title.textContent = plan.name || "Untitled draft";


        var meta = document.createElement("p");

        meta.className = "meta";

        meta.textContent =
            (plan.date || "No date") + " - " +
            (plan.duration || "No duration");


        information.appendChild(title);

        information.appendChild(meta);


        // Plan status.

        var statusContainer = document.createElement("div");

        var status = document.createElement("span");


        if (plan.status === "draft") {

            status.className = "pill pill--draft";

            status.textContent = "Draft";

        } else if (plan.status === "saved-local") {

            status.className = "pill pill--ok";

            status.textContent = "Saved locally";

        } else {

            status.className = "pill pill--ok";

            status.textContent = "Saved locally";
        }


        statusContainer.appendChild(status);


        // Action buttons.

        var actions = document.createElement("div");

        actions.className = "actions";


        var editButton = document.createElement("button");

        editButton.type = "button";

        editButton.className = "btn";

        editButton.textContent =
            plan.status === "draft" ? "Continue" : "Modify";

        editButton.setAttribute("data-edit", plan.id);


        var deleteButton = document.createElement("button");

        deleteButton.type = "button";

        deleteButton.className = "btn btn-danger";

        deleteButton.textContent = "Delete";

        deleteButton.setAttribute("data-del", plan.id);


        actions.appendChild(editButton);

        actions.appendChild(deleteButton);


        row.appendChild(information);

        row.appendChild(statusContainer);

        row.appendChild(actions);

        host.appendChild(row);
    }
}


// ============================================
// EDITING AND DELETING PLANS
// ============================================

function setupPlanActions() {

    var host = byClass(".modify-delete");

    if (host === null) {
        return;
    }

    host.addEventListener("click", function (event) {

        var button = event.target.closest("button");

        if (button === null) {
            return;
        }

        var editId = button.getAttribute("data-edit");

        var deleteId = button.getAttribute("data-del");


        if (editId !== null) {

            editPlan(editId);
        }

        if (deleteId !== null) {

            deletePlan(deleteId);
        }
    });
}


function editPlan(id) {

    var plans = getPlans();

    var selectedPlan = null;


    for (var i = 0; i < plans.length; i++) {

        if (plans[i].id === id) {

            selectedPlan = plans[i];

            break;
        }
    }


    if (selectedPlan === null) {
        return;
    }


    editingPlanId = id;


    byId("sessionName").value = selectedPlan.name || "";

    byId("sessionDate").value = selectedPlan.date || "";

    byId("sessionTime").value = selectedPlan.duration || "";

    byId("sessionTopic").value = selectedPlan.topic || "";

    byId("sessionSteps").value = selectedPlan.steps || "";

    byId("sessionMaterials").value = selectedPlan.materials || "";

    byId("sessionSafetyNotes").value = selectedPlan.safety || "";

    byId("inclusionPrompts").value = selectedPlan.inclusion || "";


    var form = byClass(".session-creation form");

    if (form === null) {
        return;
    }


    var submitButton =
        form.querySelector('button[type="submit"]');

    if (submitButton !== null) {

        submitButton.textContent = "Update session plan";
    }


    form.scrollIntoView();

    byId("sessionName").focus();
}


function deletePlan(id) {

    var sure = confirm(
        "Delete this session plan? This cannot be undone."
    );

    if (sure === false) {
        return;
    }


    var plans = getPlans();

    var remaining = [];


    for (var i = 0; i < plans.length; i++) {

        if (plans[i].id !== id) {

            remaining.push(plans[i]);
        }
    }


    if (saveToStorage(KEY_PLANS, remaining) === false) {

        alert("The plan could not be deleted.");

        return;
    }


    // Also remove its local changes queue entry.

    if (removeFromQueue(id) === false) {

        showAppMessage(
            "The plan was deleted, but its local changes record could not be updated. Check browser storage.",
            "error"
        );
    }


    if (editingPlanId === id) {

        editingPlanId = null;

        var form = byClass(".session-creation form");

        if (form !== null) {

            form.reset();

            var submitButton =
                form.querySelector('button[type="submit"]');

            if (submitButton !== null) {

                submitButton.textContent = "Save session plan";
            }
        }
    }


    showPlans();

    updateDashboardNumbers();
}


// ============================================
// ACTIVITY FILTERING
// ============================================

function setupActivityFilter() {

    var section = byClass(".activity-filtering");

    if (section === null) {
        return;
    }


    var buttons = section.querySelectorAll("button");

    var applyButton = null;

    var resetButton = null;


    for (var i = 0; i < buttons.length; i++) {

        if (buttons[i].type === "reset") {

            resetButton = buttons[i];

        } else if (buttons[i].classList.contains("btn-primary")) {

            applyButton = buttons[i];
        }
    }


    function filterActivities() {

        var level = byId("level").value;

        var topic = byId("topic").value;

        var duration = byId("time-availability").value;

        var material = byId("materials-used").value;


        var cards = byClassAll(".activity-card");

        var shown = 0;


        for (var i = 0; i < cards.length; i++) {

            var text = cards[i].textContent.toLowerCase();

            var durationMatch = true;


            if (duration !== "Any duration") {

                var requiredMinutes = parseInt(duration, 10);

                var durationText = cards[i].querySelector(".meta");


                durationMatch =
                    durationText !== null &&
                    durationText.textContent.indexOf(
                        requiredMinutes + " min"
                    ) !== -1;
            }


            var matches =

                (level === "Any level" ||
                    text.indexOf(level.toLowerCase()) !== -1) &&

                (topic === "Any topic" ||
                    text.indexOf(topic.toLowerCase()) !== -1) &&

                durationMatch &&

                (material === "Any material" ||
                    text.indexOf(material.toLowerCase()) !== -1);


            cards[i].hidden = !matches;


            if (matches) {
                shown++;
            }
        }


        var status = section.querySelector(".hint");

        if (status !== null) {

            status.textContent = "Showing " + shown + " activities.";
        }
    }


    if (applyButton !== null) {

        applyButton.addEventListener("click", function (event) {

            event.preventDefault();

            filterActivities();
        });
    }


    if (resetButton !== null) {

        resetButton.addEventListener("click", function () {

            byId("level").selectedIndex = 0;

            byId("topic").selectedIndex = 0;

            byId("time-availability").selectedIndex = 0;

            byId("materials-used").selectedIndex = 0;


            var cards = byClassAll(".activity-card");


            for (var i = 0; i < cards.length; i++) {

                cards[i].hidden = false;
            }


            var status = section.querySelector(".hint");

            if (status !== null) {

                status.textContent =
                    "Showing " + cards.length + " activities.";
            }
        });
    }
}


// ============================================
// ACTIVITY BUTTONS
// ============================================

function setupActivityButtons() {

    document.addEventListener("click", function (event) {

        var button = event.target.closest("button");

        if (button === null) {
            return;
        }


        var card = button.closest(".activity-card");

        if (card === null) {
            return;
        }


        // Save an activity locally.

        if (button.hasAttribute("data-save-activity")) {

            var heading = card.querySelector("h3");

            if (heading === null) {
                return;
            }


            var title = heading.textContent.trim();

            var activities = loadFromStorage(KEY_ACTIVITIES, []);


            if (Array.isArray(activities) === false) {

                activities = [];
            }


            var alreadySaved = false;


            for (var i = 0; i < activities.length; i++) {

                if (activities[i].title === title) {

                    alreadySaved = true;

                    break;
                }
            }


            if (alreadySaved) {

                updateActivityButtons();

                return;
            }


            var activity = {

                id: makeId(),

                title: title,

                savedAt: currentTime()
            };


            activities.push(activity);


            if (saveToStorage(KEY_ACTIVITIES, activities) === false) {

                alert("Activity could not be saved.");

                return;
            }


            var queued = addToQueue(
                "Saved activity",
                title,
                activity.id
            );


            if (queued === false) {

                alert(
                    "The activity was saved locally, but its local changes record could not be saved."
                );
            }


            button.disabled = true;

            button.textContent = "Saved";


            var pill = card.querySelector(".pill");


            if (pill !== null) {

                pill.textContent = "Saved offline";

                pill.className = "pill pill--ok";
            }


            updateDashboardNumbers();
        }


        // Put the activity name into the session form.

        if (button.hasAttribute("data-plan-activity")) {

            var heading = card.querySelector("h3");


            if (heading !== null) {

                byId("sessionName").value =
                    heading.textContent.trim();

                byId("sessionName").focus();

                byClass(".session-creation").scrollIntoView();
            }
        }
    });
}


// Set activity buttons and labels from actual saved data.

function updateActivityButtons() {

    var activities = loadFromStorage(KEY_ACTIVITIES, []);


    if (Array.isArray(activities) === false) {

        activities = [];
    }


    var cards = byClassAll(".activity-card");


    for (var i = 0; i < cards.length; i++) {

        var heading = cards[i].querySelector("h3");

        var button = cards[i].querySelector("[data-save-activity]");

        var pill = cards[i].querySelector(".pill");


        if (heading === null || button === null) {
            continue;
        }


        var title = heading.textContent.trim();

        var saved = false;


        for (var j = 0; j < activities.length; j++) {

            if (activities[j].title === title) {

                saved = true;

                break;
            }
        }


        button.disabled = saved;

        button.textContent = saved ? "Saved" : "Save offline";


        if (pill !== null) {

            pill.textContent =
                saved ? "Saved offline" : "Not downloaded";

            pill.className = saved
                ? "pill pill--ok"
                : "pill pill--draft";
        }
    }
}


// ============================================
// DASHBOARD NUMBERS
// ============================================

function updateDashboardNumbers() {

    var activityCount = byId("saved-activity-count");

    var planCount = byId("session-plan-count");

    var queueCount = byId("pending-sync-count");


    var activities = loadFromStorage(KEY_ACTIVITIES, []);

    var plans = getPlans();


    if (activityCount !== null) {

        activityCount.textContent =
            Array.isArray(activities) ? activities.length : 0;
    }


    if (planCount !== null) {

        planCount.textContent = plans.length;
    }


    if (queueCount !== null) {

        queueCount.textContent = countUnsyncedItems();
    }
}


// ============================================
// START FACILITATOR FUNCTIONALITY
// ============================================

window.addEventListener("load", function () {

    setupFacilitatorPage();
});
