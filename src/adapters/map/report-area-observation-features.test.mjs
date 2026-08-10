// FEATURE:      Paired expected and raw Cisco area observation features
// SURFACE:      node --test src/adapters/map/report-area-observation-features.test.mjs
// WHY TOGETHER: Window endpoints and corridor samples share one paired-evidence contract.
// STATE:        Synthetic scored observations
// RULES:        Same-floor fixes connect; missing and wrong-floor fixes never do.
// PROVENANCE:   Room/corridor area-resolution map

import assert from "node:assert/strict";
import test from "node:test";

import { areaObservationFeatures, isDisplayedAreaFailure }
  from "./report-area-observation-features.mjs";

const point = { lng: 170.5, lat: -45.8, z: 2 };

test("an explicit missing window endpoint never falls back to primary", () => {
  const features = areaObservationFeatures({
    resultId: "run", checkpointId: "room", observationKind: "dwell",
    target: point, expectedRoom: { name: "Clinic" }, scored: true, resolved: true,
    primary: { status: "resolved", point }, windowExit: null,
    moments: [{ status: "resolved", point }],
  });
  assert.equal(features.cisco.length, 0);
  assert.equal(features.line.length, 0);
});

test("a corridor checkpoint uses its one primary raw Cisco sample", () => {
  const observation = {
    resultId: "run", checkpointId: "corridor", observationKind: "corridor-point",
    target: point, expectedRoom: { name: "Corridor" }, scored: true, resolved: true,
    primary: { status: "resolved", point },
  };
  const features = areaObservationFeatures(observation);
  assert.equal(features.cisco.length, 1);
  assert.equal(features.cisco[0].properties.phase, "sample");
  assert.equal(features.line.length, 1);
  assert.equal(features.line[0].properties.verdict, "inside");
  assert.deepEqual(features.line[0].geometry.coordinates, [
    [point.lng, point.lat], [point.lng, point.lat],
  ]);
  assert.equal(isDisplayedAreaFailure(observation), false);
});

test("wrong-floor raw Cisco evidence stays on its reported floor without a connector", () => {
  const observation = {
    resultId: "run", checkpointId: "floor", observationKind: "corridor-point",
    target: point, expectedRoom: { name: "Corridor" }, scored: true, resolved: false,
    primary: {
      status: "wrong-floor", point: { lng: 170.6, lat: -45.8, z: 3 },
    },
  };
  const features = areaObservationFeatures(observation);
  assert.equal(features.cisco[0].properties.z, 3);
  assert.equal(features.truth.properties.z, 2);
  assert.equal(features.line.length, 0);
  assert.equal(isDisplayedAreaFailure(observation), true);
});

test("a dwell is filtered by its displayed window endpoint, not its majority", () => {
  const observation = {
    resultId: "run", checkpointId: "room", observationKind: "dwell",
    target: point, expectedRoom: { name: "Clinic" }, scored: true, resolved: true,
    primary: { status: "resolved", point },
    windowExit: { status: "wrong-room", point: { ...point, lng: 170.6 } },
  };
  assert.equal(isDisplayedAreaFailure(observation), true);
  observation.resolved = false;
  observation.primary = { status: "wrong-room", point: { ...point, lng: 170.6 } };
  observation.windowExit = { status: "resolved", point };
  assert.equal(isDisplayedAreaFailure(observation), false);
});
