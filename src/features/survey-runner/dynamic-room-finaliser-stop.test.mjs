// FEATURE:      Dynamic room finalisation safety
// SURFACE:      Confirmed Stop during unresolved Finish
// WHY TOGETHER: Polling and completion status must change atomically around routing waits.
// STATE:        One never-resolving route finalisation promise
// RULES:        Confirmed Stop remains available and can never be overwritten as completed.
// PROVENANCE:   Step 4 Runner dynamic-room review

import assert from "node:assert/strict";
import test from "node:test";

import { createDynamicRoomFinaliser } from "./dynamic-room-finaliser.mjs";

test("Stop aborts polling while Finish is waiting for routing", () => {
  const events = [];
  const session = {
    phase: "walking",
    captureLocked: false,
    checkpoints: [
      { id: "checkpoint-1", stopId: "stop-1", dwellSeconds: 0 },
      { id: "checkpoint-2", stopId: "stop-2", dwellSeconds: 0 },
    ],
    stops: [{ id: "stop-1" }, { id: "stop-2" }],
    dwell: null,
    events,
  };
  const pollLoop = {
    active: true,
    stop() { this.active = false; },
  };
  const state = {
    completionStatus: null,
    error: null,
    events,
    finaliseStatus: null,
    finalising: null,
    polls: [],
    session,
    startedAt: "2026-07-30T01:00:00.000Z",
  };
  const finaliser = createDynamicRoomFinaliser({
    session,
    state,
    routeAuthor: { finalise: () => new Promise(() => {}) },
    definition: { meta: { surveyId: "template" } },
    pollLoop,
    nowIso: () => "2026-07-30T01:01:00.000Z",
    nowMs: () => 60_000,
    nowDate: () => new Date("2026-07-30T01:01:00.000Z"),
    setTimer: () => 1,
    onRender() {},
    operatorComment: () => "",
    createId: () => "result",
  });
  assert.ok(finaliser.finish() instanceof Promise);
  assert.equal(pollLoop.active, true);
  assert.equal(finaliser.abort(), true);
  assert.equal(pollLoop.active, false);
  assert.equal(state.completionStatus, "aborted");
  assert.equal(state.finaliseStatus, "aborted");
  assert.equal(session.phase, "completed");
  assert.equal(events.at(-1).type, "run-aborted");
});
