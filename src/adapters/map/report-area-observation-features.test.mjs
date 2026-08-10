// FEATURE:      Low-clutter raw Cisco area observation features
// SURFACE:      node --test src/adapters/map/report-area-observation-features.test.mjs
// WHY TOGETHER: Window endpoint and corridor sample selection form one raw-ring contract.
// STATE:        Synthetic scored observations
// RULES:        Never substitute the majority representative for a missing dwell endpoint.
// PROVENANCE:   Room/corridor area-resolution map

import assert from "node:assert/strict";
import test from "node:test";

import { areaObservationFeatures }
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
  const features = areaObservationFeatures({
    resultId: "run", checkpointId: "corridor", observationKind: "corridor-point",
    target: point, expectedRoom: { name: "Corridor" }, scored: true, resolved: true,
    primary: { status: "resolved", point },
  });
  assert.equal(features.cisco.length, 1);
  assert.equal(features.cisco[0].properties.phase, "sample");
  assert.equal(features.line.length, 0);
});
