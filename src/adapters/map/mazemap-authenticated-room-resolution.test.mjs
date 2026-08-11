// FEATURE:      Authenticated bulk room resolution
// SURFACE:      node --test src/adapters/map/mazemap-authenticated-room-resolution.test.mjs
// WHY TOGETHER: Token order, map-derived buildings, paging, and local matching form one contract.
// STATE:        Fake authenticated MazeMap SDK with two rendered buildings
// RULES:        Building POIs load only after map readiness; no point POI API may classify a dot.
// PROVENANCE:   Consolidated MazeMap area-resolution evidence

import assert from "node:assert/strict";
import test from "node:test";

import { roomContainsPoint } from "../../domain/report-room-geometry.mjs";
import { createMazeMapAdapter } from "./mazemap.mjs";

test("authenticated rendered buildings page once and classify both geometry types locally", async () => {
  const state = harness();
  const adapter = createMazeMapAdapter({ Mazemap: state.sdk });
  const target = { lng: 10, lat: 10, z: 2 };
  const observedPoint = { lng: 30, lat: 30, z: 2 };
  await assert.rejects(
    adapter.resolveCampusRooms([target, observedPoint]),
    /loaded authenticated map/,
  );
  assert.equal(state.clicks.length, 0);
  assert.equal(state.poiQueries.length, 0);
  await adapter.launch("private-view-token", null, { campusId: 566 });

  assert.equal(adapter.ready, true);
  assert.equal(state.clicks.length, 0);
  assert.equal(state.poiQueries.length, 0);
  const rooms = await adapter.resolveCampusRooms([target, observedPoint]);

  assert.deepEqual(rooms.map(room => room.id).sort(), ["multipolygon", "polygon"]);
  assert.deepEqual(state.clicks, [
    { lng: target.lng, lat: target.lat },
    { lng: observedPoint.lng, lat: observedPoint.lat },
  ]);
  assert.deepEqual(state.poiQueries.map(query => query.buildingid).sort(), [101, 202]);
  assert.ok(state.poiQueries.every(query => query.campusid === 566));
  assert.equal(state.nextPageCalls, 1);
  assert.ok(state.lifecycle.indexOf("map:loaded") < state.lifecycle.indexOf("map:click-data"));
  assert.ok(state.lifecycle.indexOf("map:loaded") < state.lifecycle.indexOf("data:pois"));

  const expected = rooms.find(room => roomContainsPoint(room, target));
  const observed = rooms.find(room => roomContainsPoint(room, observedPoint));
  assert.equal(expected.id, "polygon");
  assert.equal(observed.id, "multipolygon");
  assert.equal(rooms.some(room => roomContainsPoint(
    room, { lng: 40, lat: 40, z: 2 },
  )), false);
  assert.deepEqual(state.providerPointCalls, { getPoi: 0, getPoiAt: 0 });
});

function harness() {
  const state = {
    clicks: [], layers: new Map(), lifecycle: [], nextPageCalls: 0,
    poiQueries: [], providerPointCalls: { getPoi: 0, getPoiAt: 0 },
    sources: new Map(),
  };
  class FakeMap {
    constructor() {
      assert.equal(state.authenticated, true);
      state.lifecycle.push("map:new");
      state.map = this;
    }
    on(event, listener) {
      if (event === "load") {
        state.lifecycle.push("map:loaded");
        state.loaded = true;
        listener();
      }
    }
    getZLevel() { return 2; }
    getLayer(id) { return state.layers.get(id); }
    addLayer(layer) { state.layers.set(layer.id, layer); }
    getSource(id) { return state.sources.get(id); }
    addSource(id, source) {
      state.sources.set(id, { ...source, setData() {} });
    }
    setFilter() {}
    setLayoutProperty() {}
    setPaintProperty() {}
    remove() {}
  }
  state.sdk = {
    Config: { setMazemapViewToken() {
      state.authenticated = true;
      state.lifecycle.push("config:token");
    } },
    Data: {
      async getCampus() { return null; },
      async getBuildingsByCampusId() { return []; },
      async getFloorsByCampusId() { return []; },
      async getPoi() { state.providerPointCalls.getPoi += 1; return null; },
      async getPoiAt() { state.providerPointCalls.getPoiAt += 1; return null; },
      async getPois(query) {
        assert.equal(state.loaded, true);
        state.lifecycle.push("data:pois");
        state.poiQueries.push(query);
        if (query.buildingid === 101) {
          return page([pointFeature(1)], async () => {
            state.nextPageCalls += 1;
            return page([roomFeature("polygon", 101, polygon(10, 10))]);
          });
        }
        return page([roomFeature("multipolygon", 202, {
          type: "MultiPolygon",
          coordinates: [polygon(20, 20).coordinates, polygon(30, 30).coordinates],
        })]);
      },
    },
    Map: FakeMap,
    Util: { getMapClickData(map, point) {
      assert.equal(state.loaded, true);
      assert.equal(map, state.map);
      state.lifecycle.push("map:click-data");
      state.clicks.push(point);
      return { campusIds: [566], buildingIds: [point.lng < 20 ? 101 : 202] };
    } },
  };
  return state;
}

function page(features, getNextPage = null) {
  return { geojson: { type: "FeatureCollection", features }, getNextPage };
}
function pointFeature(id) {
  return { type: "Feature", id, properties: { poiId: id, zLevel: 2 },
    geometry: { type: "Point", coordinates: [0, 0] } };
}
function roomFeature(id, buildingId, geometry) {
  return { type: "Feature", id, properties: { poiId: id, buildingId, zLevel: 2 }, geometry };
}
function polygon(lng, lat) {
  return { type: "Polygon", coordinates: [[
    [lng - 1, lat - 1], [lng + 1, lat - 1], [lng + 1, lat + 1],
    [lng - 1, lat + 1], [lng - 1, lat - 1],
  ]] };
}
