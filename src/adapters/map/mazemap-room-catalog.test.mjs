// FEATURE:      MazeMap building room catalogue
// SURFACE:      node --test src/adapters/map/mazemap-room-catalog.test.mjs
// WHY TOGETHER: Rendered-building discovery, pagination, and per-building caching share one contract.
// STATE:        Fake MazeMap SDK pages and map-click building identities
// RULES:        Exhaust every page once; never refetch a building when later observations add another.
// PROVENANCE:   Consolidated MazeMap area-resolution evidence

import assert from "node:assert/strict";
import test from "node:test";

import { createMazeMapQueries } from "./mazemap-queries.mjs";
import { loadMazeMapRoomCatalog } from "./mazemap-room-catalog.mjs";

test("rendered building discovery exhausts full getPois pages", async () => {
  const map = { id: "private-map" };
  const clicks = [];
  const calls = [];
  const first = Array.from({ length: 2000 }, (_, index) => pointFeature(index + 1));
  const sdk = {
    Data: { async getPois(query) {
      calls.push(query);
      return query.fromid === 0 ? first : [roomFeature(2001, 9)];
    } },
    Util: { getMapClickData(value, point) {
      clicks.push([value, point]);
      return { campusIds: [566], buildingIds: [9], floorIds: [90] };
    } },
  };
  const rooms = await loadMazeMapRoomCatalog({
    sdk, catalog: {}, campusId: 566, map,
    points: [{ lng: 170.5, lat: -45.8 }, { lng: 170.5, lat: -45.8 }],
  });
  assert.deepEqual(rooms.map(room => room.id), ["2001"]);
  assert.deepEqual(calls, [
    { campusid: 566, buildingid: 9, limit: 2000, fromid: 0 },
    { campusid: 566, buildingid: 9, limit: 2000, fromid: 2001 },
  ]);
  assert.deepEqual(clicks, [[map, { lng: 170.5, lat: -45.8 }]]);
});

test("provider getNextPage results are exhausted", async () => {
  let firstCalls = 0;
  let nextCalls = 0;
  const sdk = { Data: { async getPois() {
    firstCalls += 1;
    return page([roomFeature(1, 7)], async () => {
      nextCalls += 1;
      return page([roomFeature(2, 7)], null);
    });
  } } };
  const rooms = await loadMazeMapRoomCatalog({
    sdk, catalog: { buildings: [{ id: 7 }] }, campusId: 566,
  });
  assert.deepEqual(rooms.map(room => room.id), ["1", "2"]);
  assert.deepEqual([firstCalls, nextCalls], [1, 1]);
});

test("later discovered buildings reuse earlier building pages", async () => {
  const calls = [];
  const sdk = {
    Data: { async getPois(query) {
      calls.push(query.buildingid);
      return [roomFeature(query.buildingid, query.buildingid)];
    } },
    Util: { getMapClickData(_map, point) {
      return { campusIds: [566], buildingIds: [point.lng], floorIds: [] };
    } },
  };
  const queries = createMazeMapQueries(
    async () => sdk, () => ({}), () => 566, () => ({}),
  );
  assert.deepEqual((await queries.resolveCampusRooms([
    { lng: 1, lat: 1 },
  ])).map(room => room.id), ["1"]);
  assert.deepEqual((await queries.resolveCampusRooms([
    { lng: 1, lat: 1 }, { lng: 2, lat: 2 },
  ])).map(room => room.id), ["1", "2"]);
  assert.deepEqual(calls, [1, 2]);
});

test("catalog buildings supplement points that are not currently rendered", async () => {
  const calls = [];
  const sdk = {
    Data: { async getPois(query) {
      calls.push(query.buildingid);
      return [roomFeature(query.buildingid, query.buildingid)];
    } },
    Util: { getMapClickData(_map, point) {
      return point.lng === 1
        ? { campusIds: [566], buildingIds: [1], floorIds: [] }
        : { campusIds: [], buildingIds: [], floorIds: [] };
    } },
  };
  const rooms = await loadMazeMapRoomCatalog({
    sdk, catalog: { buildings: [{ id: 2 }] }, campusId: 566, map: {},
    points: [{ lng: 1, lat: 1 }, { lng: 2, lat: 2 }],
  });
  assert.deepEqual(rooms.map(room => room.id).sort(), ["1", "2"]);
  assert.deepEqual(calls.sort(), [1, 2]);
});

test("an exact full page requests and accepts an empty terminal page", async () => {
  let calls = 0;
  const full = [roomFeature(1, 7), ...Array.from(
    { length: 1999 }, (_, index) => pointFeature(index + 2),
  )];
  const rooms = await loadMazeMapRoomCatalog({
    sdk: { Data: { async getPois() { calls += 1; return calls === 1 ? full : []; } } },
    catalog: { buildings: [{ id: 7 }] }, campusId: 566,
  });
  assert.deepEqual(rooms.map(room => room.id), ["1"]);
  assert.equal(calls, 2);
});

test("pagination rejects a full page whose POI cursor does not advance", async () => {
  const repeated = Array.from({ length: 2000 }, (_, index) => pointFeature(index + 1));
  await assert.rejects(loadMazeMapRoomCatalog({
    sdk: { Data: { getPois: async () => repeated } },
    catalog: { buildings: [{ id: 7 }] }, campusId: 566,
  }), /pagination did not advance/);
});

test("a full page without usable POI IDs cannot be accepted as complete", async () => {
  const noIds = Array.from({ length: 2000 }, () => ({
    type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [0, 0] },
  }));
  await assert.rejects(loadMazeMapRoomCatalog({
    sdk: { Data: { getPois: async () => noIds } },
    catalog: { buildings: [{ id: 7 }] }, campusId: 566,
  }), /cannot advance without POI IDs/);
});

function page(features, getNextPage) {
  return { geojson: { type: "FeatureCollection", features }, getNextPage };
}

function pointFeature(id) {
  return { type: "Feature", id, properties: { poiId: id, zLevel: 0 },
    geometry: { type: "Point", coordinates: [id, 0] } };
}

function roomFeature(id, buildingId) {
  return { type: "Feature", id, properties: {
    poiId: id, buildingId, title: `Room ${id}`, zLevel: 0,
  }, geometry: { type: "Polygon", coordinates: [[
    [id, 0], [id + 0.5, 0], [id + 0.5, 0.5], [id, 0],
  ]] } };
}
