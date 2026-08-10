// FEATURE:      MazeMap room resolution
// SURFACE:      node --test src/adapters/map/mazemap-room.test.mjs
// WHY TOGETHER: POI identity, floor, and geometry normalization share one adapter contract.
// STATE:        Provider-shaped POI samples
// RULES:        Only Polygon and MultiPolygon geometry enters room scoring.
// PROVENANCE:   Dynamic dwell room-resolution evidence

import assert from "node:assert/strict";
import test from "node:test";

import {
  mergeMazeMapRooms,
  normalizeMazeMapRoom,
} from "./mazemap-room.mjs";

test("room normalization preserves provider identity and polygon geometry", () => {
  const geometry = {
    type: "Polygon",
    coordinates: [[[170, -45], [171, -45], [171, -46], [170, -45]]],
  };
  const room = normalizeMazeMapRoom({
    id: 42,
    properties: { title: "Clinic", zLevel: 1 },
    geometry,
  }, 0);
  assert.deepEqual(room, { id: "42", name: "Clinic", z: 1, geometry });
  geometry.coordinates[0][0][0] = 0;
  assert.equal(room.geometry.coordinates[0][0][0], 170);
});

test("detailed room values merge with point-lookup fallbacks", () => {
  assert.deepEqual(mergeMazeMapRooms(
    { id: "42", name: null, z: 1, geometry: { type: "Polygon", coordinates: [] } },
    { id: "42", name: "Clinic", z: 1, geometry: null },
  ), {
    id: "42", name: "Clinic", z: 1,
    geometry: { type: "Polygon", coordinates: [] },
  });
});
