
const test = require("node:test");
const assert = require("node:assert");

const {
    validatePlan,
    createPlanId,
    savePlanToList,
    parseStoredData
} = require("../plan-logic.js");


// AT01: Validate session plans
test("AT01 - Rejects a plan with missing required fields", function() {

    const plan = {
        name: "Mathematics Workshop",
        date: "",
        duration: "60 minutes",
        topic: "Basic Mathematics"
    };

    assert.strictEqual(validatePlan(plan), false);
});


// AT02: Generate unique identifiers
test("AT02 - Generates unique plan IDs", function() {

    const firstId = createPlanId();
    const secondId = createPlanId();

    assert.notStrictEqual(firstId, secondId);
});


// AT03: Update an existing plan
test("AT03 - Updates an existing plan without duplicating it", function() {

    const existingPlans = [
        {
            id: "plan-001",
            name: "Mathematics Workshop"
        }
    ];

    const updatedPlan = {
        id: "plan-001",
        name: "Advanced Mathematics Workshop"
    };

    const result = savePlanToList(existingPlans, updatedPlan);

    assert.strictEqual(result.length, 1);
    assert.strictEqual(
        result[0].name,
        "Advanced Mathematics Workshop"
    );
});


// AT04: Handle invalid stored JSON
test("AT04 - Returns a default value when JSON is invalid", function() {

    const invalidData = "{invalid json";
    const defaultValue = [];

    const result = parseStoredData(invalidData, defaultValue);

    assert.deepStrictEqual(result, []);
});
