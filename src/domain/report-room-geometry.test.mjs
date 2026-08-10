// FEATURE:      Room polygon evidence
// SURFACE:      node --test src/domain/report-room-geometry.test.mjs
// WHY TOGETHER: Polygon, hole, MultiPolygon, boundary, and floor cases share containment rules.
// STATE:        Synthetic GeoJSON rooms
// RULES:        Exact point coordinates and z-level decide membership.
// PROVENANCE:   Dynamic dwell room-resolution evidence

import assert from "node:assert/strict";
import test from "node:test";

import { roomContainsPoint } from "./report-room-geometry.mjs";

const square = coordinates => ({
  id: "room-a",
  z: 1,
  geometry: { type: "Polygon", coordinates },
});
const outer = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]];

test("polygon containment includes its outer boundary and enforces floor", () => {
  const room = square([outer]);
  assert.equal(roomContainsPoint(room, { lng: 2, lat: 2, z: 1 }), true);
  assert.equal(roomContainsPoint(room, { lng: 0, lat: 2, z: 1 }), true);
  assert.equal(roomContainsPoint(room, { lng: 5, lat: 2, z: 1 }), false);
  assert.equal(roomContainsPoint(room, { lng: 2, lat: 2, z: 2 }), false);
});

test("holes and MultiPolygon parts retain GeoJSON membership", () => {
  const hole = [[1, 1], [3, 1], [3, 3], [1, 3], [1, 1]];
  assert.equal(roomContainsPoint(square([outer, hole]), {
    lng: 2, lat: 2, z: 1,
  }), false);
  const room = {
    z: 1,
    geometry: { type: "MultiPolygon", coordinates: [
      [outer],
      [[[10, 10], [12, 10], [12, 12], [10, 12], [10, 10]]],
    ] },
  };
  assert.equal(roomContainsPoint(room, { lng: 11, lat: 11, z: 1 }), true);
});
