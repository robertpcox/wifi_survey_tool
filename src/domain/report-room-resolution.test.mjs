// FEATURE:      Dynamic room-resolution scoring
// SURFACE:      node --test src/domain/report-room-resolution.test.mjs
// WHY TOGETHER: Room outcomes and stationary dwell transitions share one verdict matrix.
// STATE:        Synthetic room polygon and observation moments
// RULES:        POI labels never override polygon/floor evidence.
// PROVENANCE:   Dynamic dwell room-resolution evidence

import assert from "node:assert/strict";
import test from "node:test";

import {
  scoreRoomMoment,
  scoreRoomObservation,
} from "./report-room-resolution.mjs";

const expected = {
  id: "room-a", name: "Clinic", z: 1,
  geometry: { type: "Polygon", coordinates: [[
    [0, 0], [2, 0], [2, 2], [0, 2], [0, 0],
  ]] },
};
const evidence = point => ({ point, pollId: "poll", ageSeconds: 3 });

test("moment verdicts distinguish room, floor, position, and truth failures", () => {
  assert.equal(scoreRoomMoment({
    evidence: evidence({ lng: 1, lat: 1, z: 1 }), expected,
  }).status, "resolved");
  assert.equal(scoreRoomMoment({
    evidence: evidence({ lng: 3, lat: 1, z: 1 }), expected,
    observed: { id: "room-b", name: "Next room", z: 1 },
  }).status, "wrong-room");
  assert.equal(scoreRoomMoment({
    evidence: evidence({ lng: 1, lat: 1, z: 2 }), expected,
  }).status, "wrong-floor");
  assert.equal(scoreRoomMoment({ evidence: evidence(null), expected }).status,
    "no-displayed-fix");
  assert.equal(scoreRoomMoment({ evidence, expected: null }).status,
    "truth-unavailable");
  assert.equal(scoreRoomMoment({
    evidence: evidence({ lng: 3, lat: 1, z: 1 }), expected,
    observedError: new Error("MazeMap unavailable"),
  }).status, "lookup-unavailable");
});

test("dwell verdict uses persisted time while retaining settlement diagnostics", () => {
  const entry = { ...evidence({ lng: 3, lat: 1, z: 1 }), atMs: 0 };
  const exit = { ...evidence({ lng: 1, lat: 1, z: 1 }), atMs: 4_000 };
  const base = {
    resultId: "run-a", checkpointId: "checkpoint-a", roomLabel: "Clinic",
    target: { lng: 1, lat: 1, z: 1 }, observationKind: "dwell",
    startMs: 0, endMs: 4_000, dwellSeconds: 4, entry, exit,
  };
  const settled = scoreRoomObservation(base, {
    expected,
    entry: { id: "room-b", name: "Next room", z: 1 },
    exit: expected,
  });
  assert.equal(settled.primary.status, "wrong-room");
  assert.equal(settled.resolved, false);
  assert.equal(settled.settleState, "resolved-during-dwell");
  assert.equal(settled.expectedRoom.geometry, expected.geometry,
    "the MazeMap polygon remains available for consolidated area fills");
  const stuckEntry = { ...evidence({ lng: 3, lat: 1, z: 1 }), atMs: 0 };
  const stuckExit = { ...stuckEntry, atMs: 4_000 };
  const stuck = scoreRoomObservation({ ...base, entry: stuckEntry, exit: stuckExit }, {
    expected,
    entry: { id: "room-b" },
    exit: { id: "room-b" },
  });
  assert.equal(stuck.primary.status, "wrong-room");
  assert.equal(stuck.stuckThroughDwell, true);
  const noFix = scoreRoomObservation({
    ...base, entry: { ...evidence(null), atMs: 0 },
    exit: { ...evidence(null), atMs: 4_000 },
  }, { expected, entry: null, exit: null });
  assert.equal(noFix.primary.status, "no-displayed-fix");
  assert.equal(noFix.scored, true);
  assert.equal(noFix.stuckThroughDwell, false);
});

test("intermediate dwell states expose temporary drift and duration", () => {
  const moments = [
    { ...evidence({ lng: 1, lat: 1, z: 1 }), atMs: 0 },
    { ...evidence({ lng: 3, lat: 1, z: 1 }), atMs: 1_000 },
    { ...evidence({ lng: 1, lat: 1, z: 1 }), atMs: 3_000 },
    { ...evidence({ lng: 1, lat: 1, z: 1 }), atMs: 4_000 },
  ];
  const scored = scoreRoomObservation({
    resultId: "run-a", checkpointId: "checkpoint-a", roomLabel: "Clinic",
    target: { lng: 1, lat: 1, z: 1 }, observationKind: "dwell",
    startMs: 0, endMs: 4_000, moments,
    entry: moments[0], exit: moments.at(-1),
  }, {
    expected,
    moments: [
      { room: expected }, { room: { id: "room-b" } },
      { room: expected }, { room: expected },
    ],
  });
  assert.equal(scored.settleState, "intermittent-resolution");
  assert.equal(scored.primary.status, "wrong-room", "an exact time tie fails");
  assert.equal(scored.tied, true);
  assert.equal(scored.dwellFailureMomentCount, 1);
  assert.equal(scored.dwellScoredSeconds, 4);
  assert.equal(scored.dwellResolvedSeconds, 2);
  assert.equal(scored.dwellResolutionPercent, 50);
});

test("all diagnostics stop at the window endpoint and primary remains the majority", () => {
  const moments = [
    { ...evidence({ lng: 1, lat: 1, z: 1 }), atMs: 0 },
    { ...evidence({ lng: 3, lat: 1, z: 1 }), atMs: 10_000 },
    { ...evidence({ lng: 1, lat: 1, z: 1 }), atMs: 20_000 },
    { ...evidence({ lng: 3, lat: 1, z: 1 }), atMs: 30_000 },
  ];
  const scored = scoreRoomObservation({
    observationKind: "dwell", startMs: 0, endMs: 30_000,
    dwellSeconds: 30, entry: moments[0], exit: moments.at(-1), moments,
  }, {
    expected,
    moments: [
      { room: expected }, { room: { id: "room-b" } },
      { room: expected }, { room: { id: "room-b" } },
    ],
  });
  assert.equal(scored.moments.length, 3);
  assert.equal(scored.exit.atMs, 20_000);
  assert.equal(scored.windowExit.status, "resolved");
  assert.equal(scored.primary.status, "wrong-room");
  assert.equal(scored.dwellScoredSeconds, 20);
  assert.equal(scored.dwellResolvedSeconds, 10);
  assert.equal(scored.dwellFailureMomentCount, 1);
  assert.equal(scored.settleState, "intermittent-resolution");
});
