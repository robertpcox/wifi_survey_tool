// FEATURE:      Captured-checkpoint route authoring tests
// SURFACE:      capturedCheckpointsV3 acceptance and rejection coverage
// WHY TOGETHER: Captured stop and mark checkpoints must stay a valid authored plan.
// STATE:        None
// RULES:        Capture order is truth; drifting identity or references must throw.
// PROVENANCE:   Structured dynamic capture request

import assert from "node:assert/strict";
import test from "node:test";

import { capturedCheckpointsV3 } from "./captured-checkpoints-v3.mjs";

const stops = [
  { id: "stop-1", lng: 170.5085, lat: -45.8724, z: 1 },
  { id: "stop-2", lng: 170.5085, lat: -45.8722, z: 1 },
];
const legs = [{ id: "leg-1", fromStopId: "stop-1", toStopId: "stop-2" }];
const captured = [
  {
    id: "checkpoint-1", sequence: 0, type: "stop",
    lng: stops[0].lng, lat: stops[0].lat, z: 1,
    stopId: "stop-1", legId: null, spacingBasisM: 5, dwellSeconds: 45,
  },
  {
    id: "checkpoint-2", sequence: 1, type: "intermediate",
    lng: 170.5085, lat: -45.87231, z: 1,
    stopId: null, legId: "leg-1", spacingBasisM: 5, dwellSeconds: 0,
  },
  {
    id: "checkpoint-3", sequence: 2, type: "stop",
    lng: stops[1].lng, lat: stops[1].lat, z: 1,
    stopId: "stop-2", legId: null, spacingBasisM: 5, dwellSeconds: 45,
  },
];

test("captured stop and mark checkpoints pass through in capture order", () => {
  const checkpoints = capturedCheckpointsV3(stops, legs, captured, 5);
  assert.deepEqual(checkpoints, captured);
  assert.notEqual(checkpoints[0], captured[0]);
});

test("identity, reference, or spacing drift is rejected", () => {
  const broken = (index, patch) => captured.map((checkpoint, at) => (
    at === index ? { ...checkpoint, ...patch } : { ...checkpoint }
  ));
  assert.throws(
    () => capturedCheckpointsV3(stops, legs, broken(1, { id: "checkpoint-9" }), 5),
    /captured identity must stay sequential/,
  );
  assert.throws(
    () => capturedCheckpointsV3(stops, legs, broken(1, { legId: "leg-9" }), 5),
    /must reference the leg being walked/,
  );
  assert.throws(
    () => capturedCheckpointsV3(stops, legs, broken(0, { lng: 170.9 }), 5),
    /must match captured stop 1/,
  );
  assert.throws(
    () => capturedCheckpointsV3(stops, legs, captured, 7),
    /spacingBasisM: must equal 7/,
  );
  assert.throws(
    () => capturedCheckpointsV3(stops, legs, captured.slice(0, 2), 5),
    /every captured stop requires a stop checkpoint/,
  );
  assert.throws(
    () => capturedCheckpointsV3(stops, legs, [], 5),
    /captured checkpoints are required/,
  );
});
