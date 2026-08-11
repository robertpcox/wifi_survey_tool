// FEATURE:      Room polygon evidence
// SURFACE:      node --test src/domain/report-room-geometry.test.mjs
// WHY TOGETHER: Polygon, hole, MultiPolygon, boundary, and floor cases share containment rules.
// STATE:        Synthetic GeoJSON rooms
// RULES:        Exact point coordinates and z-level decide membership.
// PROVENANCE:   Dynamic dwell room-resolution evidence

import assert from "node:assert/strict";
import test from "node:test";

import { haversine } from "./geometry.mjs";
import {
  distanceOutsideRoomM, roomContainsPoint,
} from "./report-room-geometry.mjs";

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

test("outside distance projects to the nearest edge and closes open rings", () => {
  const room = square([[[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001]]]);
  const east = { lng: 0.0011, lat: 0.0005, z: 1 };
  const west = { lng: -0.0001, lat: 0.0005, z: 1 };
  const expectedM = haversine(east, { lng: 0.001, lat: east.lat });
  assert.ok(Math.abs(distanceOutsideRoomM(room, east) - expectedM) < 0.001);
  assert.ok(Math.abs(distanceOutsideRoomM(room, west) - expectedM) < 0.001,
    "the implicit closing edge participates in distance");
  assert.equal(distanceOutsideRoomM(room, { lng: 0.0005, lat: 0.0005, z: 1 }), 0);
  assert.equal(distanceOutsideRoomM(room, { lng: 0, lat: 0.0005, z: 1 }), 0);
});

test("hole and MultiPolygon boundaries participate in nearest distance", () => {
  const shell = [[-0.001, -0.001], [0.001, -0.001], [0.001, 0.001],
    [-0.001, 0.001], [-0.001, -0.001]];
  const hole = [[-0.0002, -0.0002], [0.0002, -0.0002],
    [0.0002, 0.0002], [-0.0002, 0.0002], [-0.0002, -0.0002]];
  const inHole = { lng: 0, lat: 0, z: 1 };
  assert.ok(Math.abs(distanceOutsideRoomM(square([shell, hole]), inHole)
    - haversine(inHole, { lng: 0, lat: 0.0002 })) < 0.001);

  const multi = { z: 1, geometry: { type: "MultiPolygon", coordinates: [
    [[[0, 0], [0.001, 0], [0.001, 0.001], [0, 0.001], [0, 0]]],
    [[[0.01, 0], [0.011, 0], [0.011, 0.001], [0.01, 0.001], [0.01, 0]]],
  ] } };
  const nearSecond = { lng: 0.0111, lat: 0.0005, z: 1 };
  assert.ok(Math.abs(distanceOutsideRoomM(multi, nearSecond)
    - haversine(nearSecond, { lng: 0.011, lat: nearSecond.lat })) < 0.001);
});

test("outside distance is unavailable without comparable floor geometry", () => {
  const room = square([outer]);
  assert.equal(distanceOutsideRoomM(room, { lng: 5, lat: 2, z: 2 }), null);
  assert.equal(distanceOutsideRoomM(room, null), null);
  assert.equal(distanceOutsideRoomM({ z: 1, geometry: null }, {
    lng: 5, lat: 2, z: 1,
  }), null);
});
