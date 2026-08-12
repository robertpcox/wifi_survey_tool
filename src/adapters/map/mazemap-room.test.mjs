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
    properties: {
      identifier: "K01.07", title: "Clinic", zLevel: 1, kind: "zone",
    },
    geometry,
  }, 0);
  assert.deepEqual(room, {
    id: "42", identifier: "K01.07", name: "Clinic", z: 1, geometry,
    kind: "zone", areaKind: "zone",
  });
  geometry.coordinates[0][0][0] = 0;
  assert.equal(room.geometry.coordinates[0][0][0], 170);
});

test("detailed room values merge with point-lookup fallbacks", () => {
  assert.deepEqual(mergeMazeMapRooms(
    {
      id: "42", identifier: null, name: null, z: 1,
      geometry: { type: "Polygon", coordinates: [] }, kind: "circulation_room",
      areaKind: "room",
    },
    { id: "42", identifier: "K01.07", name: "Clinic", z: 1, geometry: null,
      kind: null, areaKind: "room" },
  ), {
    id: "42", identifier: "K01.07", name: "Clinic", z: 1,
    geometry: { type: "Polygon", coordinates: [] },
    kind: "circulation_room", areaKind: "room",
  });
});

test("blank provider titles fall through while non-zone kinds remain rooms", () => {
  const room = normalizeMazeMapRoom({
    properties: {
      poiId: 7, title: "  ", name: "Main corridor",
      identifier: "  ", roomNumber: "C01", kind: "circulation_room", zLevel: 0,
    },
  });
  assert.deepEqual(room, {
    id: "7", identifier: "C01", name: "Main corridor", z: 0,
    geometry: null, kind: "circulation_room", areaKind: "room",
  });
});

test("only an exact provider zone kind is classified as a zone", () => {
  const normalized = kind => normalizeMazeMapRoom({
    properties: { poiId: kind, kind },
  });
  assert.deepEqual([normalized("zone"), normalized("circulation_room")]
    .map(room => [room.kind, room.areaKind]), [
    ["zone", "zone"], ["circulation_room", "room"],
  ]);
  assert.equal(normalizeMazeMapRoom({ id: "root-zone", kind: "zone" }).areaKind,
    "zone");
});
