// FEATURE:      Runner checkpoint navigation tests
// SURFACE:      Node test for createRunnerNavigation(options)
// WHY TOGETHER: Skip truth, Back correction, dwell cancellation, and debounce are one contract.
// STATE:        Deterministic progress, action clock, events, and callbacks per test
// RULES:        No skipped checkpoint may become check-in ground truth.
// PROVENANCE:   Android field safety and closed-area Runner feedback

import assert from "node:assert/strict";
import test from "node:test";
import {
  createRunnerProgress,
  startRunnerProgress,
} from "../../domain/runner-progress-v3.mjs";
import {
  createRunnerNavigation,
  NAVIGATION_DEBOUNCE_MS,
} from "./run-navigation.mjs";

function harness(dwellSeconds = 0) {
  const definition = {
    meta: { route: { checkpointDwellSeconds: dwellSeconds } },
    route: {
      stops: [],
      checkpoints: ["a", "b", "c"].map((id, sequence) => ({
        id, sequence, lng: sequence + 1, lat: 2, z: 1,
      })),
    },
  };
  const state = {
    completionStatus: null,
    events: [],
    note: null,
    progress: startRunnerProgress(createRunnerProgress(definition)),
  };
  const calls = { back: 0, dwell: 0, refresh: 0 };
  let actionMs = 100;
  let eventSecond = 0;
  const navigation = createRunnerNavigation({
    state,
    nowIso: () => `2026-07-28T01:00:0${eventSecond++}.000Z`,
    nowMs: () => actionMs,
    onBack: () => calls.back++,
    onDwell: () => calls.dwell++,
    onRefresh: () => calls.refresh++,
  });
  return {
    actionMs: value => { actionMs = value; },
    calls,
    navigation,
    state,
  };
}

test("same-action double taps cannot advance two checkpoints", () => {
  const { actionMs, navigation, state } = harness();
  assert.equal(navigation.checkIn(), true);
  actionMs(100 + NAVIGATION_DEBOUNCE_MS - 1);
  assert.equal(navigation.checkIn(), false);
  assert.equal(state.progress.currentIndex, 1);
  assert.deepEqual(state.progress.checkIns.map(item => item.checkpointId), ["a"]);
  assert.deepEqual(state.events.map(event => event.type), ["checkpoint-reached"]);
});

test("Back removes the latest reached or skipped evidence", () => {
  const { calls, navigation, state } = harness();
  navigation.checkIn();
  assert.equal(navigation.back(), true);
  assert.deepEqual(state.progress.checkIns, []);
  assert.deepEqual(state.events, []);
  assert.equal(state.progress.checkpoints[0].state, "current");
  navigation.skip();
  assert.equal(state.progress.checkpoints[0].state, "skipped");
  assert.equal(navigation.back(), true);
  assert.deepEqual(state.events, []);
  assert.equal(calls.back, 2);
});

test("closed-area skips remain exception events through explicit end", () => {
  const { navigation, state } = harness();
  navigation.skip();
  navigation.checkIn();
  navigation.skip();
  assert.equal(state.progress.phase, "awaiting-end");
  assert.deepEqual(state.progress.checkIns.map(item => item.checkpointId), ["b"]);
  assert.deepEqual(state.events.map(event => event.type), [
    "checkpoint-skipped",
    "checkpoint-reached",
    "checkpoint-skipped",
  ]);
  assert.equal(state.events.some(event => event.type === "endpoint-hold-started"), false);
});

test("Back cancels a reached checkpoint dwell and notes block navigation", () => {
  const { calls, navigation, state } = harness(2);
  navigation.checkIn();
  assert.equal(state.progress.phase, "dwelling");
  assert.equal(calls.dwell, 1);
  navigation.back();
  assert.equal(state.progress.phase, "walking");
  assert.equal(calls.back, 1);
  state.note = { id: "note-1" };
  assert.equal(navigation.skip(), false);
});
