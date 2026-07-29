// FEATURE:      Creator route reset
// SURFACE:      Unit tests for clearCreatorRoute(options)
// WHY TOGETHER: Reset assertions protect both cleared route state and retained configuration.
// STATE:        Representative engaged Creator state
// RULES:        Imported route identity is cleared while campus and locked plan survive.
// PROVENANCE:   Scope/steps/03_build_creator.md

import assert from "node:assert/strict";
import test from "node:test";

import { clearCreatorRoute } from "./controller-clear-route.mjs";

test("clear route flushes points but keeps engagement and checkpoint plan", async () => {
  const emptyRoute = {
    checkpoints: [],
    distanceM: 0,
    duration: { walkingSeconds: 0, dwellSeconds: 0, totalSeconds: 0 },
    legs: [],
    shortLegs: [],
  };
  const state = {
    engagedCampusId: "566",
    imported: { previousDefinition: {} },
    plan: { spacingM: 10, midLegDwellSeconds: 5, legEndDwellSeconds: 30 },
    planLocked: true,
    route: { checkpoints: [{}], legs: [{}] },
    selectedIndex: 1,
    shortWarningDismissed: true,
    stops: [{ id: "a" }, { id: "b" }],
  };
  const calls = { renders: 0 };
  const view = {
    clearMapSelection: () => { calls.cleared = true; },
    selectStop: (...args) => { calls.selection = args; },
    setStatus: (...args) => { calls.status = args; },
  };
  const workflow = {
    rebuild: async (stops, plan) => {
      calls.rebuild = { stops, plan };
      return emptyRoute;
    },
  };
  assert.equal(await clearCreatorRoute({
    render: () => calls.renders++,
    state,
    view,
    workflow,
  }), true);
  assert.deepEqual(state.stops, []);
  assert.equal(state.route, emptyRoute);
  assert.equal(state.imported, null);
  assert.equal(state.engagedCampusId, "566");
  assert.equal(state.planLocked, true);
  assert.equal(calls.rebuild.plan, state.plan);
  assert.deepEqual(calls.selection, [null, -1]);
  assert.equal(calls.cleared, true);
  assert.equal(calls.renders, 1);
  assert.match(calls.status[0], /configuration.*unchanged/);
});
