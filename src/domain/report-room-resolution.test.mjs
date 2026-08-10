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

test("dwell scores the exit and exposes late settlement or a stuck dot", () => {
  const base = {
    resultId: "run-a", checkpointId: "checkpoint-a", roomLabel: "Clinic",
    target: { lng: 1, lat: 1, z: 1 }, observationKind: "dwell",
    entry: evidence({ lng: 3, lat: 1, z: 1 }),
    exit: evidence({ lng: 1, lat: 1, z: 1 }),
  };
  const settled = scoreRoomObservation(base, {
    expected,
    entry: { id: "room-b", name: "Next room", z: 1 },
    exit: expected,
  });
  assert.equal(settled.primary.status, "resolved");
  assert.equal(settled.settleState, "resolved-during-dwell");
  const stuckPoint = evidence({ lng: 3, lat: 1, z: 1 });
  const stuck = scoreRoomObservation({ ...base, entry: stuckPoint, exit: stuckPoint }, {
    expected,
    entry: { id: "room-b" },
    exit: { id: "room-b" },
  });
  assert.equal(stuck.primary.status, "wrong-room");
  assert.equal(stuck.stuckThroughDwell, true);
  const noFix = scoreRoomObservation({
    ...base, entry: evidence(null), exit: evidence(null),
  }, { expected, entry: null, exit: null });
  assert.equal(noFix.primary.status, "no-displayed-fix");
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
  assert.equal(scored.dwellFailureMomentCount, 1);
  assert.equal(scored.dwellScoredSeconds, 4);
  assert.equal(scored.dwellResolvedSeconds, 2);
  assert.equal(scored.dwellResolutionPercent, 50);
});
