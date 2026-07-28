// FEATURE:      Creator dwell interactions
// SURFACE:      Creator dwell action tests
// WHY TOGETHER: Save and move-on share the same controller seam.
// STATE:        In-memory Creator route harness
// RULES:        Tests verify explicit seconds and zero are passed to workflow.
// PROVENANCE:   Scope/steps/03_build_creator.md

import assert from "node:assert/strict";
import test from "node:test";

import { createCreatorDwellActions } from "./controller-dwell.mjs";

test("checkpoint dwell actions save an edit or choose move on", () => {
  const updates = [];
  const state = { route: { checkpoints: [] } };
  const actions = createCreatorDwellActions({
    render: () => updates.push("render"),
    requirePlan: () => updates.push("plan"),
    state,
    view: {
      readCheckpointDwell: () => "12",
      setStatus: message => updates.push(message),
    },
    workflow: {
      updateCheckpointDwell(route, sequence, dwellSeconds) {
        updates.push([sequence, Number(dwellSeconds)]);
        return { ...route, dwellSeconds: Number(dwellSeconds) };
      },
    },
  });
  assert.equal(actions.dispatch("unrelated"), false);
  assert.equal(actions.dispatch("save-checkpoint-dwell", {
    dataset: { sequence: "1" },
  }), true);
  assert.equal(state.route.dwellSeconds, 12);
  actions.dispatch("clear-checkpoint-dwell", {
    dataset: { sequence: "1" },
  });
  assert.equal(state.route.dwellSeconds, 0);
  assert.deepEqual(
    updates.filter(Array.isArray),
    [[1, 12], [1, 0]],
  );
});
