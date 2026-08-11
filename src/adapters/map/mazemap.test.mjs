// FEATURE:      MazeMap provider adapter
// SURFACE:      Credentialed launch, POI query, and classified failure regression tests
// WHY TOGETHER: Existing Creator/Runner adapter behavior remains one compatibility suite.
// STATE:        Fake SDK map, catalog, marker, source, and token calls
// RULES:        Credentialed behavior is preserved while failures use typed classifications.
// PROVENANCE:   Scope/steps/05a_recast_player.md Creator/Runner preservation
import test from "node:test";
import assert from "node:assert/strict";
import { createMazeMapAdapter } from "./mazemap.mjs";
function mazemapHarness(mode = "load") {
  const state = {
    buildingsCalls: [], campusCalls: [], floorsCalls: [], layers: new Map(),
    lifecycle: [], markers: [], poiAtCalls: [], sources: new Map(),
  };
  class FakeMap {
    constructor(options) {
      state.lifecycle.push("map:new"); state.map = this;
      this.options = options;
      this.zLevel = "2";
      this.zoom = 18;
      this.events = {};
    }
    on(event, listener) {
      this.events[event] = listener;
      if (mode === "error" && event === "error") {
        listener({ error: Error("tiles"), sourceId: "campus-tiles" });
      }
      if (mode === "load" && event === "load") listener();
    }
    getSource(id) { return state.sources.get(id); }
    addSource(id, value) { state.sources.set(id, { ...value, setData() {} }); }
    getLayer(id) { return state.layers.get(id); }
    addLayer(layer) { state.layers.set(layer.id, layer); }
    getZLevel() { return this.zLevel; }
    setZLevel(z) { this.setZ = z; this.zLevel = z; }
    getZoom() { return this.zoom; }
    stop() { this.stopped = true; }
    easeTo(camera) { this.easyCamera = camera; }
    flyTo(camera) { this.flyCamera = camera; }
    enable3d() { state.threeD = "enabled"; }
    disable3d() { state.threeD = "disabled"; }
    remove() { this.removed = true; }
    setPaintProperty() {}
  }
  class MazeMarker {
    constructor(options) { this.options = options; state.markers.push(this); }
    setLngLat(value) { this.lngLat = value; return this; }
    addTo(map) { this.map = map; return this; }
    remove() { this.removed = (this.removed ?? 0) + 1; }
  }
  const poi = { properties: { buildingId: 51, zLevel: 3, poiId: 91 } };
  state.Mazemap = {
    Config: { setMazemapViewToken: token => state.lifecycle.push(`config:${token}`) },
    Data: {
      async getCampus(id) {
        state.lifecycle.push("data:campus"); state.campusCalls.push(id);
        return {
          properties: { name: "Runtime Campus" },
          geometry: { coordinates: [[[10, 20], [14, 20], [14, 24], [10, 24]]] },
        };
      },
      async getBuildingsByCampusId(id) {
        state.lifecycle.push("data:buildings"); state.buildingsCalls.push(id);
        return [{ properties: { id: 51, name: "Library" } }];
      },
      async getFloorsByCampusId(id) {
        state.lifecycle.push("data:floors"); state.floorsCalls.push(id);
        return [{ properties: { id: 61, z: 3, name: "Level Three" } }];
      },
      async getPoiAt(point, z) { state.poiAtCalls.push([point, z]); return poi; },
      async getPoi(id) { return { id }; },
    },
    Map: FakeMap,
    MazeMarker,
  };
  return state;
}
test("launch configures private access before Map and loads catalog afterward", async () => {
  const state = mazemapHarness();
  let loads = 0;
  const adapter = createMazeMapAdapter({
    loadMazemap: async () => { loads += 1; return state.Mazemap; },
    threeD: { animateWalls: true, show3dAssets: true },
  });
  assert.equal(adapter.Mazemap, null);
  const onClick = () => {};
  assert.equal(await adapter.launch("runtime-secret", onClick, { campusId: "777" }), 2);
  assert.equal(loads, 1);
  assert.equal(adapter.Mazemap, state.Mazemap);
  assert.deepEqual([adapter.campusId, adapter.campusName], [777, "Runtime Campus"]);
  assert.deepEqual(state.lifecycle, ["config:runtime-secret", "map:new", "data:campus", "data:floors", "data:buildings"]);
  assert.deepEqual(state.map.options, {
    container: "map", campuses: 777, zoom: 18, center: [170.508292, -45.872428],
    threeD: { animateWalls: true, show3dAssets: true },
  });
  assert.deepEqual(state.map.easyCamera, { center: [12, 22], duration: 0 });
  adapter.focusWaypoint({ lng: 170.5, lat: -45.8, z: 2 });
  assert.deepEqual([state.threeD, state.map.easyCamera.pitch], ["enabled", 45]);
  assert.equal(state.map.events.click, onClick);
  assert.equal(adapter.ready, true);
  assert.deepEqual(state.campusCalls, [777]);
  assert.deepEqual(state.floorsCalls, [777]);
  assert.deepEqual(state.buildingsCalls, [777]);
  state.map.zLevel = 3;
  const fitted = adapter.fitRoute({ stops: [{ lng: 170.5, lat: -45.8 }] });
  assert.deepEqual([fitted, adapter.currentZLevel, state.map.zLevel], [true, 2, 3]);
});
test("describePoint caches catalogs and a 3D choice survives map relaunch", async () => {
  const state = mazemapHarness();
  const adapter = createMazeMapAdapter({
    Mazemap: state.Mazemap,
    threeD: { animateWalls: true, show3dAssets: true },
  });
  await adapter.launch("memory-only", undefined, { campusId: 777 });
  assert.deepEqual(await adapter.describePoint(170.5, -45.8, 3), {
    building: { id: "51", name: "Library" },
    floor: { id: "61", z: 3, name: "Level Three" },
    poi: { center: null, id: "91", name: null },
  });
  assert.deepEqual(state.poiAtCalls, [[{ lng: 170.5, lat: -45.8 }, 3]]);
  assert.deepEqual(await adapter.lookupPoi(91), { id: 91 });
  assert.equal(adapter.set3dEnabled(false), true);
  assert.equal(state.map.easyCamera.pitch, 0);
  await adapter.launch("new-memory-only", undefined, { campusId: 777 });
  assert.deepEqual([state.threeD, adapter.threeDEnabled], ["disabled", false]);
  assert.deepEqual(state.campusCalls, [777]);
});
test("describePoint gives actionable errors for unmapped clicks", async () => {
  const state = mazemapHarness();
  state.Mazemap.Data.getPoiAt = async () => null;
  const adapter = createMazeMapAdapter({ Mazemap: state.Mazemap });
  await adapter.launch("runtime-token");
  await assert.rejects(
    adapter.describePoint(1, 2, 3),
    /click inside a mapped building/,
  );
});
test("map errors and timeouts reject instead of leaving Engage hanging", async () => {
  const failed = mazemapHarness("error");
  await assert.rejects(
    createMazeMapAdapter({ Mazemap: failed.Mazemap }).launch("token"),
    error => error.classification === "tiles",
  );
  const stalled = mazemapHarness("stall");
  await assert.rejects(
    createMazeMapAdapter({ Mazemap: stalled.Mazemap, mapLoadTimeoutMs: 5 })
      .launch("token"),
    error => error.classification === "timeout",
  );
});
