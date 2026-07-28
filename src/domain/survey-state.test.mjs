import assert from "node:assert/strict";
import test from "node:test";

import {
  createRouteState,
  createSessionState,
  resetWalk,
} from "./survey-state.mjs";

test("createRouteState returns fresh empty route-building state", () => {
  const first = createRouteState();
  assert.deepEqual(first, {
    buildVersion: 0,
    legs: [],
    loadBusy: false,
    selectionVersion: 0,
    stops: [],
    waypoints: [],
  });
  const second = createRouteState();
  assert.notEqual(first, second);
  assert.notEqual(first.stops, second.stops);
  assert.notEqual(first.legs, second.legs);
});

test("createSessionState returns fresh capture and walk state", () => {
  const state = createSessionState();
  assert.deepEqual(state, {
    events: [],
    meta: {
      startedAt: null,
      endedAt: null,
      routeName: "",
    },
    pollRun: {
      cloud: false,
      lipi: false,
    },
    sampleCounts: {
      cloud: 0,
      lipi: 0,
    },
    sampleSeq: 0,
    samples: [],
    walk: {
      phase: "idle",
      wpIdx: -1,
      history: [],
    },
  });
  const second = createSessionState();
  assert.notEqual(state.samples, second.samples);
  assert.notEqual(state.walk, second.walk);
});

test("resetWalk replaces only the walk state", () => {
  const state = createSessionState();
  state.events.push({ type: "walk_start" });
  state.walk = {
    phase: "done",
    wpIdx: 4,
    history: [{ wpIdx: 4 }],
  };
  const events = state.events;
  resetWalk(state);
  assert.deepEqual(state.walk, {
    phase: "idle",
    wpIdx: -1,
    history: [],
  });
  assert.equal(state.events, events);
  assert.deepEqual(state.events, [{ type: "walk_start" }]);
});
