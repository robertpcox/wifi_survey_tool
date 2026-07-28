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
});

test("queries reject when the installed SDK lacks a required endpoint", async () => {
  const queries = createMazeMapQueries(async () => ({ Data: {} }), () => ({}));
  await assert.rejects(queries.describePoint(1, 2, 3), /point lookup is unavailable/);
  await assert.rejects(queries.lookupPoi(1), /POI lookup is unavailable/);
});
