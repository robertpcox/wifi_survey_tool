// FEATURE:      Common-area report presentation
// SURFACE:      node --test src/adapters/map/report-common-area-summary.test.mjs
// WHY TOGETHER: Public typing and non-overlapping map fill are one presentation contract.
// STATE:        Synthetic scored corridor observations
// RULES:        Keep common evidence points; never paint a floor outline over named rooms.
// PROVENANCE:   Consolidated area-resolution map

import assert from "node:assert/strict";
import test from "node:test";

import { aggregateAreaPolygons } from "../../domain/report-area-summary.mjs";
import { areaPolygonFeatures } from "./report-area-polygon-features.mjs";

const geometry = { type: "Polygon", coordinates: [[
  [0, 0], [10, 0], [10, 10], [0, 10], [0, 0],
]] };

test("common floor truth is retained on observations but omitted from polygon fill", () => {
  const common = {
    id: "floor:1:common", areaKind: "common-area", name: "Ground common area",
    z: 0, geometry,
  };
  const observation = {
    expectedRoom: common, target: { lng: 1, lat: 1, z: 0 },
    primary: { status: "wrong-room" }, observationKind: "corridor-point",
  };
  assert.equal(observation.expectedRoom.areaKind, "common-area");
  assert.deepEqual(aggregateAreaPolygons([observation]), []);
  assert.deepEqual(areaPolygonFeatures([{
    ...common, insideSampleCount: 0, outsideSampleCount: 1,
  }]), []);
});

test("named room polygons keep their explicit type and remain fillable", () => {
  const polygons = aggregateAreaPolygons([{
    expectedRoom: { id: "clinic", areaKind: "room", name: "Clinic", z: 0, geometry },
    target: { lng: 1, lat: 1, z: 0 },
    primary: { status: "resolved" }, observationKind: "dwell",
  }]);
  assert.equal(polygons[0].areaKind, "room");
  assert.equal(areaPolygonFeatures(polygons)[0].properties.areaKind, "room");
});
