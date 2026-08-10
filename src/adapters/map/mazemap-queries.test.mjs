// FEATURE:      MazeMap point metadata queries
// SURFACE:      Lazy SDK point-description and POI lookup tests
// WHY TOGETHER: Query forwarding and unavailable-API errors share one provider boundary.
// STATE:        Fake SDK query calls
// RULES:        Returned descriptions use the current campus catalog.
// PROVENANCE:   Existing Creator/Runner MazeMap query acceptance preserved in Step 5a

import assert from "node:assert/strict";
import test from "node:test";

import { createMazeMapQueries } from "./mazemap-queries.mjs";

test("queries resolve lazily and describe provider POIs with current catalog names", async () => {
  const calls = [];
  const sdk = {
    Data: {
      getPoiAt: async (point, z) => {
        calls.push([point, z]);
        return { properties: { buildingId: 1, floorId: 2, zLevel: z, poiId: 3 } };
      },
      getPoi: async id => ({ id }),
    },
  };
  const queries = createMazeMapQueries(async () => sdk, () => ({
    buildings: [{ properties: { id: 1, name: "Building" } }],
    floors: [{ properties: { id: 2, z: 4, name: "Fourth" } }],
  }));
  assert.deepEqual(await queries.describePoint(170.5, -45.8, 4), {
    building: { id: "1", name: "Building" },
    floor: { id: "2", z: 4, name: "Fourth" },
    poi: { center: null, id: "3", name: null },
  });
  assert.deepEqual(calls, [[{ lng: 170.5, lat: -45.8 }, 4]]);
  assert.deepEqual(await queries.lookupPoi(9), { id: 9 });
  assert.deepEqual(await queries.resolveRoomById(9, 4), {
    id: "9", name: null, z: 4, geometry: null,
  });
});

test("room lookup fetches missing full geometry and handles no nearby POI", async () => {
  const geometry = {
    type: "Polygon",
    coordinates: [[[1, 2], [2, 2], [2, 3], [1, 2]]],
  };
  let nearby = { properties: { poiId: 9, title: "Room", zLevel: 3 } };
  const queries = createMazeMapQueries(async () => ({ Data: {
    getPoiAt: async () => nearby,
    getPoi: async id => ({ id, geometry }),
  } }), () => ({}));
  assert.deepEqual(await queries.resolveRoomAt(1, 2, 3), {
    id: "9", name: "Room", z: 3, geometry,
  });
  nearby = false;
  assert.equal(await queries.resolveRoomAt(1, 2, 3), null);
});

test("queries reject when the installed SDK lacks a required endpoint", async () => {
  const queries = createMazeMapQueries(async () => ({ Data: {} }), () => ({}));
  await assert.rejects(queries.describePoint(1, 2, 3), /point lookup is unavailable/);
  await assert.rejects(queries.lookupPoi(1), /POI lookup is unavailable/);
  await assert.rejects(queries.resolveRoomAt(1, 2, 3), /room lookup is unavailable/);
  await assert.rejects(queries.resolveRoomById(1, 3), /POI lookup is unavailable/);
});
