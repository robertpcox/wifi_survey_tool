import assert from "node:assert/strict";
import test from "node:test";

import {
  deriveMapCoverage,
  mapContextFromPoi,
} from "./map-coverage.mjs";

const context = Object.freeze({
  building: { id: "101", name: "Clinical Services" },
  floor: { id: "501", name: "Level 00", z: 1 },
  poi: { id: "9001", name: "Room 1" },
});

function stop(id, z = 1, mapContext = context) {
  return {
    id,
    locationType: "room",
    provenance: { method: "map" },
    z,
    _mapContext: mapContext,
  };
}

test("coverage is derived, deduplicated, and sorted from committed route points", () => {
  const other = {
    building: { id: "202", name: "Outpatients" },
    floor: { id: "502", name: "Level 01", z: 2 },
  };
  const result = deriveMapCoverage({
    stops: [stop("a"), stop("b", 2, other), stop("c")],
    legs: [{ geometry: [{ z: 3 }] }],
    fallbackMeta: {
      buildings: [],
      zLevels: [3],
      zLevelNames: { 3: "Level 02" },
    },
  });
  assert.deepEqual(result.buildings, [
    { id: "101", name: "Clinical Services" },
    { id: "202", name: "Outpatients" },
  ]);
  assert.deepEqual(result.zLevels, [1, 2, 3]);
  assert.deepEqual(result.zLevelNames, {
    1: "Level 00",
    2: "Level 01",
    3: "Level 02",
  });
});

test("coverage rejects unclicked indoor stops and unnamed route levels", () => {
  assert.throws(
    () => deriveMapCoverage({ stops: [stop("a", 1, null)] }),
    /click the engaged map/,
  );
  assert.throws(
    () => deriveMapCoverage({
      stops: [stop("a")],
      legs: [{ geometry: [{ z: 4 }] }],
    }),
    /zLevelNames.4/,
  );
});

test("imported metadata is a safe fallback and preview mode is non-blocking", () => {
  const fallbackMeta = {
    buildings: [{ id: "old", name: "Imported Building" }],
    zLevels: [0],
    zLevelNames: { 0: "Ground" },
  };
  assert.deepEqual(
    deriveMapCoverage({
      stops: [stop("imported", 0, null)],
      fallbackMeta,
    }),
    {
      buildings: fallbackMeta.buildings,
      zLevels: [0],
      zLevelNames: { 0: "Ground" },
    },
  );
  assert.deepEqual(
    deriveMapCoverage({ stops: [], strict: false }),
    { buildings: [], zLevels: [], zLevelNames: {} },
  );
});

test("coordinate-only stops add zN coverage without inventing a building", () => {
  const coordinateOnly = {
    coordinateOnly: true,
    building: { id: null, name: null },
    floor: { id: null, name: "z2", z: 2 },
    poi: { center: null, id: null, name: null },
  };
  assert.deepEqual(deriveMapCoverage({
    stops: [stop("mapped"), stop("coordinate", 2, coordinateOnly)],
  }), {
    buildings: [{ id: "101", name: "Clinical Services" }],
    zLevels: [1, 2],
    zLevelNames: { 1: "Level 00", 2: "z2" },
  });
  const sameLevel = {
    ...coordinateOnly,
    floor: { id: null, name: "z1", z: 1 },
  };
  assert.equal(deriveMapCoverage({
    stops: [stop("coordinate", 1, sameLevel), stop("mapped")],
  }).zLevelNames[1], "Level 00");
  assert.throws(
    () => deriveMapCoverage({ stops: [stop("coordinate", 2, coordinateOnly)] }),
    /meta.buildings/,
  );
});

test("POI properties become safe authoring context", () => {
  assert.deepEqual(mapContextFromPoi({
    properties: {
      buildingId: 101,
      buildingName: "Clinical Services",
      floorId: 501,
      floorName: "Level 00",
      poiId: 9001,
      title: "Room 1",
      zLevel: 1,
    },
  }), context);
});
