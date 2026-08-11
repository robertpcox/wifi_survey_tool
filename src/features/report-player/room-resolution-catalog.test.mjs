// FEATURE:      Room-resolution polygon catalogue
// SURFACE:      node --test src/features/report-player/room-resolution-catalog.test.mjs
// WHY TOGETHER: Bulk caching, nested containment, and wrong-room identity share one contract.
// STATE:        Synthetic catalogues plus one dynamic result fixture
// RULES:        Raw Cisco points are classified locally and catalogue failures remain retryable.
// PROVENANCE:   Dynamic MazeMap room and corridor resolution

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createCampusRoomCatalog, expectedCatalogRoom, knownRoomIndex, observedKnownRoom,
} from "./room-resolution-catalog.mjs";
import { createRoomResolutionLoader } from "./room-resolution-loader.mjs";

const source = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("campus polygons identify an unvisited wrong room without point lookups", async () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.checkpoints[0].dwellSeconds = 6;
  result.polls.find(item => item.id === "poll-3").normalized.lng = 170.5008;
  let catalogCalls = 0;
  let targetCalls = 0;
  const loader = createRoomResolutionLoader({
    resolveCampusRooms: async () => {
      catalogCalls += 1;
      return [
        room("room-one", 170.5, -45.87, 0, 0.00005),
        room("corridor", 170.5002, -45.87, 0, 0.00005),
        room("room-two", 170.5004, -45.87, 1, 0.00005),
        room("unvisited-room", 170.5008, -45.87, 0, 0.00005),
      ];
    },
    resolveRoomAt: async () => {
      targetCalls += 1;
      throw new Error("catalogue should cover every truth target");
    },
  });
  const summary = await loader.load([{ result, exceptions: [] }]);
  const first = summary.observations
    .find(item => item.checkpointId === "checkpoint-a");
  assert.equal(first.primary.status, "wrong-room");
  assert.equal(first.primary.room.id, "unvisited-room");
  assert.equal(catalogCalls, 1);
  assert.equal(targetCalls, 0);
  await loader.load([{ result, exceptions: [] }]);
  assert.equal(catalogCalls, 1, "a successful catalogue stays cached");
});

test("smallest containing polygon wins unless the captured POI id is authoritative", () => {
  const parent = room("parent", 1, 1, 0, 1);
  const child = room("child", 1, 1, 0, 0.25);
  const target = { lng: 1, lat: 1, z: 0 };
  assert.equal(expectedCatalogRoom({ target }, [parent, child]).id, "child");
  assert.equal(expectedCatalogRoom({
    target, expectedPoiId: "parent",
  }, [parent, child]).id, "parent");
  const expected = room("expected", 5, 5, 0, 0.25);
  const known = knownRoomIndex([{ expected }], [parent, child]);
  assert.equal(observedKnownRoom(target, expected, known).room.id, "child");
});

test("wrong-floor dots retain the room identity resolved on their actual floor", () => {
  const expected = room("expected", 1, 1, 0, 0.25);
  const destination = {
    ...room("destination", 1, 1, 1, 0.25),
    identifier: "L1.07",
    name: "Ward store",
  };
  const known = knownRoomIndex([{ expected }], [destination]);
  const observed = observedKnownRoom({ lng: 1, lat: 1, z: 1 }, expected, known);
  assert.equal(observed.room.id, "destination");
  assert.equal(observed.room.identifier, "L1.07");
  assert.equal(observed.room.name, "Ward store");
});

test("a rejected catalogue is visible and can retry with corrected access", async () => {
  let calls = 0;
  const load = createCampusRoomCatalog(async () => {
    calls += 1;
    if (calls === 1) throw new Error("private polygons denied");
    return [room("ready", 1, 1, 0, 0.25)];
  });
  await assert.rejects(load(), /private polygons denied/);
  assert.equal((await load())[0].id, "ready");
  assert.equal((await load())[0].id, "ready");
  assert.equal(calls, 2, "only rejected catalogue promises are cleared");
});

test("loader surfaces catalogue denial without falling back to target lookups", async () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  let targetCalls = 0;
  const loader = createRoomResolutionLoader({
    resolveCampusRooms: async () => { throw new Error("private polygons denied"); },
    resolveRoomAt: async () => {
      targetCalls += 1;
      return room("fallback", 170.5, -45.87, 0, 0.25);
    },
  });
  await loader.load([{ result, exceptions: [] }]);
  assert.equal(loader.status, "error");
  assert.match(loader.error.message, /private polygons denied/);
  assert.equal(targetCalls, 0);
});

function room(id, lng, lat, z, radius) {
  return { id, name: id, z, geometry: { type: "Polygon", coordinates: [[
    [lng - radius, lat - radius], [lng + radius, lat - radius],
    [lng + radius, lat + radius], [lng - radius, lat + radius],
    [lng - radius, lat - radius],
  ]] } };
}
