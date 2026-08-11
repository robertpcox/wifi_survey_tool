// FEATURE:      Authenticated MazeMap room-catalogue lifecycle
// SURFACE:      node --test src/adapters/map/mazemap-room-lifecycle.test.mjs
// WHY TOGETHER: Token, map load, idle rendering, building discovery, and POI paging form one order.
// STATE:        Deferred fake MazeMap load and idle events
// RULES:        No provider Data call or bulk POI request may precede its readiness boundary.
// PROVENANCE:   Consolidated MazeMap area-resolution evidence

import assert from "node:assert/strict";
import test from "node:test";

import { createMazeMapAdapter } from "./mazemap.mjs";

test("bulk room POIs wait for a tokened loaded and rendered map", async () => {
  const state = harness();
  const adapter = createMazeMapAdapter({
    Mazemap: state.sdk,
    requestAnimationFrame: callback => queueMicrotask(callback),
  });
  const launch = adapter.launch("private-token", null, {
    campusId: 566, center: [170.5, -45.8],
  });
  await until(() => state.map);
  assert.deepEqual(state.lifecycle, ["token", "map:new"]);
  await assert.rejects(
    adapter.resolveCampusRooms([{ lng: 170.5, lat: -45.8, z: 0 }]),
    /loaded authenticated map/,
  );
  assert.equal(state.getPoisCalls.length, 0);

  state.lifecycle.push("map:load");
  state.map.emit("load");
  await launch;
  assert.equal(state.mapOptions.zLevel, 1);
  assert.deepEqual(state.setZLevels, [1]);
  assert.equal(state.map.getZLevel(), 1);
  assert.deepEqual(state.cameras, [], "the explicit runtime center is preserved");
  assert.deepEqual(state.lifecycle.slice(0, 6), [
    "token", "map:new", "map:load", "data:campus", "data:floors", "data:buildings",
  ]);

  state.map.moving = true;
  const roomsWork = adapter.resolveCampusRooms([
    { lng: 170.5, lat: -45.8, z: 0 },
  ]);
  await Promise.resolve();
  assert.equal(state.clicks.length, 0);
  assert.equal(state.getPoisCalls.length, 0);
  state.map.moving = false;
  state.lifecycle.push("map:idle");
  state.map.emit("idle");
  const rooms = await roomsWork;
  assert.deepEqual(rooms.map(room => room.id), ["91"]);
  assert.deepEqual(state.clicks, [[state.map, { lng: 170.5, lat: -45.8 }]]);
  assert.deepEqual(state.getPoisCalls, [
    { campusid: 566, buildingid: 51, limit: 2000, fromid: 0 },
  ]);
  assert.ok(state.lifecycle.indexOf("data:pois") > state.lifecycle.indexOf("map:idle"));
});

function harness() {
  const state = { lifecycle: [], clicks: [], getPoisCalls: [], cameras: [],
    setZLevels: [], map: null, mapOptions: null };
  class Map {
    constructor(options) {
      state.lifecycle.push("map:new");
      state.mapOptions = options;
      state.map = this;
      this.events = new globalThis.Map();
      this.layers = new globalThis.Map();
      this.sources = new globalThis.Map();
      this.moving = false;
    }
    on(name, callback) { this.events.set(name, callback); }
    once(name, callback) { this.events.set(name, callback); }
    emit(name) { this.events.get(name)?.(); }
    getZLevel() { return this.zLevel; }
    setZLevel(value) { this.zLevel = value; state.setZLevels.push(value); }
    getZoom() { return 18; }
    getLayer(id) { return this.layers.get(id); }
    addLayer(layer) { this.layers.set(layer.id, layer); }
    getSource(id) { return this.sources.get(id); }
    addSource(id, source) { this.sources.set(id, { ...source, setData() {} }); }
    easeTo(camera) { state.cameras.push(camera); }
    isMoving() { return this.moving; }
    remove() {}
  }
  state.sdk = {
    Config: { setMazemapViewToken() { state.lifecycle.push("token"); } },
    Map,
    Data: {
      async getCampus() { state.lifecycle.push("data:campus"); return {
        geometry: { coordinates: [[[10, 20], [14, 20], [14, 24], [10, 24]]] },
      }; },
      async getFloorsByCampusId() { state.lifecycle.push("data:floors"); return []; },
      async getBuildingsByCampusId() {
        state.lifecycle.push("data:buildings"); return [{ id: 51 }];
      },
      async getPois(query) {
        state.lifecycle.push("data:pois");
        state.getPoisCalls.push(query);
        return [roomFeature()];
      },
    },
    Util: { getMapClickData(map, point) {
      state.clicks.push([map, point]);
      return { campusIds: [566], buildingIds: [51], floorIds: [] };
    } },
  };
  return state;
}

function roomFeature() {
  return { type: "Feature", id: 91, properties: { poiId: 91, zLevel: 0 },
    geometry: { type: "Polygon", coordinates: [[
      [170.49, -45.81], [170.51, -45.81], [170.51, -45.79], [170.49, -45.81],
    ]] } };
}

async function until(predicate) {
  while (!predicate()) await Promise.resolve();
}
