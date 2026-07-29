// FEATURE:      Runner incident-note capture
// SURFACE:      linked route anchor, cancellation, pause, placement, and resume tests
// WHY TOGETHER: One harness proves the complete temporary capture state.
// STATE:        In-memory active run state
// RULES:        Add preserves one held ground truth; cancel preserves no capture.
// PROVENANCE:   Runner offline field feedback

import assert from "node:assert/strict";
import test from "node:test";

import { createRunnerNoteCapture } from "./note-capture.mjs";

function harness() {
  const state = {
    completionStatus: null,
    events: [],
    notes: [],
    note: null,
    progress: {
      currentIndex: 1,
      checkpoints: [
        { id: "checkpoint-a", stopId: "stop-a", state: "done" },
        { id: "checkpoint-b", stopId: "stop-b", state: "current" },
      ],
    },
  };
  const calls = { focuses: [], renders: 0, starts: 0, stops: 0 };
  const times = [
    "2026-07-29T01:00:00.000Z",
    "2026-07-29T01:00:12.500Z",
    "2026-07-29T01:01:00.000Z",
  ];
  const definition = {
    route: {
      hash: "a".repeat(64),
      legs: [{ id: "leg-a-b", fromStopId: "stop-a", toStopId: "stop-b" }],
    },
  };
  const capture = createRunnerNoteCapture({
    state,
    definition,
    currentPosition: () => ({ lng: 170.5, lat: -45.8, z: 1 }),
    mapAdapter: {
      focusWaypoint: point => calls.focuses.push(point),
      setMapZLevel() {},
    },
    nowIso: () => times.shift(),
    onRender: () => calls.renders++,
    pollLoop: {
      start: () => calls.starts++,
      stop: () => calls.stops++,
    },
  });
  return { calls, capture, definition, state };
}

test("saved note and event share a typed route anchor and distinct note ID", () => {
  const { calls, capture, definition, state } = harness();
  const routeBefore = structuredClone(definition.route);
  assert.equal(capture.open("source-failure", "proxy offline"), true);
  assert.equal(capture.place({ lng: 170.6, lat: -45.9, z: 2 }), true);
  const note = capture.add("Wi-Fi disconnected");
  assert.equal(note.id, "note-1");
  assert.equal("checkpointId" in note, false);
  assert.deepEqual(note.routeAnchor, {
    type: "checkpoint-interval",
    routeHash: "a".repeat(64),
    fromCheckpointId: "checkpoint-a",
    toCheckpointId: "checkpoint-b",
    legId: "leg-a-b",
  });
  assert.equal(note.dwellSeconds, 12.5);
  assert.deepEqual(note.groundTruth, { lng: 170.6, lat: -45.9, z: 2 });
  assert.equal(state.events[0].noteId, note.id);
  assert.deepEqual(state.events[0].routeAnchor, note.routeAnchor);
  assert.equal("checkpointId" in state.events[0], false);
  assert.equal(calls.stops, 1);
  assert.equal(calls.starts, 1);
  assert.equal(calls.focuses.length, 2);
  assert.deepEqual(definition.route, routeBefore);
});

test("cancel resumes without recording a note or event", () => {
  const { calls, capture, state } = harness();
  capture.open();
  assert.equal(capture.cancel(), true);
  assert.deepEqual(state.notes, []);
  assert.deepEqual(state.events, []);
  assert.equal(calls.starts, 1);
});
