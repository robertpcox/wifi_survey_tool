import test from "node:test";
import assert from "node:assert/strict";
import { createMazeMapAdapter } from "./mazemap.mjs";
function mazemapHarness() {
  const state = {
    layers: new Map(),
    markers: [],
    paintCalls: [],
    sources: new Map(),
    tokens: [],
  };
  class FakeMap {
    constructor(options) {
      state.map = this;
      this.options = options;
      this.zLevel = 2;
      this.zoom = 18;
      this.events = {};
    }
    on(event, listener) {
      this.events[event] = listener;
      if (event === "load") listener();
    }
    getSource(id) { return state.sources.get(id); }
    addSource(id, definition) {
      state.sources.set(id, { ...definition, setData() {} });
    }
    getLayer(id) { return state.layers.get(id); }
    addLayer(layer) { state.layers.set(layer.id, layer); }
    getZLevel() { return this.zLevel; }
    setZLevel(z) {
      this.setZ = z;
      this.zLevel = z;
    }
    getZoom() { return this.zoom; }
    stop() { this.stopped = true; }
    easeTo(camera) { this.easyCamera = camera; }
    flyTo(camera) { this.flyCamera = camera; }
    setPaintProperty(...args) { state.paintCalls.push(args); }
  }
  class MazeMarker {
    constructor(options) {
      this.options = options;
      state.markers.push(this);
    }
    setLngLat(lngLat) {
      this.lngLat = lngLat;
      return this;
    }
    addTo(map) {
      this.map = map;
      return this;
    }
    remove() { this.removed = (this.removed || 0) + 1; }
  }
  state.Mazemap = {
    Config: {
      setMazemapViewToken(token) {
        state.tokens.push(token);
      },
    },
    Map: FakeMap,
    MazeMarker,
  };
  return state;
}
test("launch requires in-memory access and recreates original map setup", async () => {
  const state = mazemapHarness();
  const adapter = createMazeMapAdapter({ Mazemap: state.Mazemap });
  await assert.rejects(adapter.launch("", () => {}), /Map access is required/);
  assert.equal(adapter.ready, false);
  const onClick = () => {};
  assert.equal(await adapter.launch("entered-at-runtime", onClick), 2);
  assert.deepEqual(state.tokens, ["entered-at-runtime"]);
  assert.deepEqual(state.map.options, {
    container: "map",
    campuses: 566,
    zoom: 18,
    center: [170.508292, -45.872428],
  });
  assert.equal(state.map.events.click, onClick);
  assert.equal(state.sources.size, 7);
  assert.equal(state.layers.size, 8);
  assert.equal(adapter.currentZLevel, 2);
  assert.equal(adapter.ready, true);
});
test("focusWaypoint owns marker, floor, and camera with legacy fallbacks", async () => {
  const state = mazemapHarness();
  const adapter = createMazeMapAdapter({ Mazemap: state.Mazemap });
  await adapter.launch("runtime-token");
  adapter.focusWaypoint({ seq: 2, lng: 170.5, lat: -45.8, z: 4 });
  const first = state.markers[0];
  assert.deepEqual(first.options, {
    color: "#f59e0b",
    size: 42,
    glyph: "3",
    glyphSize: 14,
    glyphColor: "#fff",
    innerCircle: true,
    innerCircleColor: "#fff",
    innerCircleScale: 0.55,
    zLevel: 4,
  });
  assert.deepEqual(first.lngLat, { lng: 170.5, lat: -45.8 });
  assert.equal(first.map, state.map);
  assert.equal(state.map.setZ, 4);
  assert.equal(state.map.stopped, true);
  assert.deepEqual(state.map.easyCamera, { center: [170.5, -45.8], zoom: 19, duration: 350 });
  state.map.easeTo = undefined;
  state.map.setZLevel = undefined;
  state.map.setZlevel = z => { state.map.legacyZ = z; };
  state.map.zoom = 20;
  adapter.focusWaypoint({ seq: 3, lng: 1, lat: 2, z: 5 });
  assert.equal(first.removed, 1);
  assert.equal(state.map.legacyZ, 5);
  assert.deepEqual(state.map.flyCamera, { center: [1, 2], zoom: 20, duration: 350 });
  adapter.clearTargetMarker();
  assert.equal(state.markers[1].removed, 1);
});
test("getMapZLevel falls back from method failure to map property", async () => {
  const state = mazemapHarness();
  const adapter = createMazeMapAdapter({ Mazemap: state.Mazemap });
  await adapter.launch("runtime-token");
  state.map.getZLevel = () => {
    throw new Error("SDK transition");
  };
  state.map.zLevel = 7;
  assert.equal(adapter.getMapZLevel(), 7);
  const oldSetInterval = globalThis.setInterval;
  const oldClearInterval = globalThis.clearInterval;
  let tick;
  let changed;
  globalThis.clearInterval = () => {};
  globalThis.setInterval = (callback, milliseconds) => {
    assert.equal(milliseconds, 250);
    tick = callback;
    return 1;
  };
  try {
    adapter.startZWatch(value => { changed = value; });
    tick();
  } finally {
    globalThis.setInterval = oldSetInterval;
    globalThis.clearInterval = oldClearInterval;
  }
  assert.equal(adapter.currentZLevel, 7);
  assert.equal(changed, 7);
  assert.equal(state.paintCalls.length, 18);
});
