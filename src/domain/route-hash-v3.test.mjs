import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalRoutePlanV3,
  hashRoutePlanV3,
} from "./route-hash-v3.mjs";

function plan() {
  return {
    stops: [{ id: "a", lng: 0, lat: 0, z: 0 }],
    legs: [{
      id: "leg-1",
      geometry: [
        { lng: 0, lat: 0, z: 0 },
        { lng: 0.1, lat: 0, z: 0 },
      ],
    }],
    checkpoints: [{
      id: "checkpoint-1", sequence: 0, lng: 0, lat: 0, z: 0,
    }],
    checkpointSpacingM: 10,
    checkpointDwellSeconds: 5,
  };
}

test("route hash is stable across key order and ignores existing hashes", async () => {
  const first = plan();
  first.hash = "old";
  first.legs[0].hash = "nested-value";
  const reordered = {
    checkpointDwellSeconds: 5,
    checkpointSpacingM: 10,
    checkpoints: first.checkpoints,
    legs: [{
      geometry: first.legs[0].geometry, id: "leg-1", hash: "nested-value",
    }],
    stops: first.stops,
    hash: "different",
  };
  assert.equal(canonicalRoutePlanV3(first), canonicalRoutePlanV3(reordered));
  assert.equal(await hashRoutePlanV3(first), await hashRoutePlanV3(reordered));
});

test("geometry, checkpoints, nested fields, spacing, and dwell affect hash", async () => {
  const original = plan();
  const baseline = await hashRoutePlanV3(original);
  const variants = ["geometry", "checkpoints", "nested", "spacing", "dwell"]
    .map(kind => {
    const changed = structuredClone(original);
    if (kind === "geometry") changed.legs[0].geometry[1].lng = 0.2;
    if (kind === "checkpoints") changed.checkpoints[0].lng = 0.01;
    if (kind === "nested") changed.checkpoints[0].hash = "extension-value";
    if (kind === "spacing") changed.checkpointSpacingM = 20;
    if (kind === "dwell") changed.checkpointDwellSeconds = 10;
    return changed;
    });
  for (const changed of variants) {
    assert.notEqual(await hashRoutePlanV3(changed), baseline);
  }
});
