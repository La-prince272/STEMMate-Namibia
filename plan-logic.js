
/* ============================================
   plan-logic.js
   STEMMate - Session plan logic
   ============================================ */

// 1. Validate a session plan.
function validatePlan(plan) {

    if (!plan) {
        return false;
    }

    return (
        typeof plan.name === "string" &&
        plan.name.trim() !== "" &&
        typeof plan.date === "string" &&
        plan.date.trim() !== "" &&
        typeof plan.duration === "string" &&
        plan.duration.trim() !== "" &&
        typeof plan.topic === "string" &&
        plan.topic.trim() !== ""
    );
}


// 2. Generate a unique plan ID.
function createPlanId() {

    return Date.now().toString(36) +
        Math.random().toString(36).substring(2, 8);
}


// 3. Add a new plan or update an existing one.
function savePlanToList(plans, newPlan) {

    var updatedPlans = [...plans];

    var index = updatedPlans.findIndex(function(plan) {
        return plan.id === newPlan.id;
    });

    if (index !== -1) {
        updatedPlans[index] = newPlan;
    } else {
        updatedPlans.push(newPlan);
    }

    return updatedPlans;
}


// 4. Safely parse stored JSON.
function parseStoredData(raw, defaultValue) {

    if (raw === null) {
        return defaultValue;
    }

    try {
        return JSON.parse(raw);
    } catch (error) {
        return defaultValue;
    }
}


// Make functions available to Node.js.
if (typeof module !== "undefined") {

    module.exports = {
        validatePlan,
        createPlanId,
        savePlanToList,
        parseStoredData
    };
}

// Make functions available to browser scripts.
if (typeof window !== "undefined") {

    window.planLogic = {
        validatePlan,
        createPlanId,
        savePlanToList,
        parseStoredData
    };
}
