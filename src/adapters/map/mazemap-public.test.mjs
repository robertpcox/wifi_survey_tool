// FEATURE:      Public-first MazeMap provider launch
// SURFACE:      No-token launch, catalog fallback, container, and resize acceptance
// WHY TOGETHER: One fake SDK proves the full public shared-map lifecycle without access setup.
// STATE:        Map constructor options, token calls, source records, and scheduled frames
// RULES:        Public success uses a live supplied container and never calls token configuration.
// PROVENANCE:   Scope/steps/05a_recast_player.md public-first acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { createMazeMapAdapter } from "./mazemap.mjs";

test("no-token launch attempts a real campus map with meta and route fallback", async () => {
  const state = harness();
  state.sdk.Data.getCampus = async () => { throw Error("catalog unavailable"); };
  const adapter = createMazeMapAdapter({
    container: "shared-map",
    documentRef: state.documentRef,
    loadMazemap: async () => { state.sdkLoads += 1; return state.sdk; },
  });
  assert.equal(await adapter.launch("", null, {
    campusId: "777",
    campusName: "Meta Campus",
    route: {
      legs: [{ geometry: [
        { lng: 170.1, lat: -45.9, z: 0 },
        { lng: 170.7, lat: -45.3, z: 1 },
      ] }],
    },
  }), 0);
  assert.equal(state.sdkLoads, 1);
  assert.deepEqual(state.tokens, []);
  assert.equal(adapter.campusId, 777);
  assert.equal(adapter.campusName, "Meta Campus");
  assert.equal(state.map.options.container, state.container);
  assert.ok(Math.abs(state.map.options.center[0] - 170.4) < 1e-12);
  assert.ok(Math.abs(state.map.options.center[1] + 45.6) < 1e-12);
  assert.equal(adapter.ready, true);
  adapter.setViewMode("playback");
  adapter.drawPlayerFrame({ walker: { ...point(170.2, 0), activeLegIndex: 4 } });
  const launchedMap = state.map;
  assert.equal(adapter.followWalker(point(170.9, 0)), true);
  assert.equal(state.map, launchedMap);
  assert.deepEqual(state.cameras.at(-1).center, [170.9, -45.8]);
  assert.deepEqual(state.filters.get("route-active-lyr"), [
    "==", ["get", "legIdx"], 4,
  ]);
  adapter.disablePlayerLayers();
  adapter.drawPlayerFrame({ walker: { ...point(170.3, 0), activeLegIndex: 8 } });
  assert.equal(state.filters.get("route-active-lyr").at(-1), 4);
});

test("public launch works without Config and resize waits for two layout frames", async () => {
  const state = harness();
  delete state.sdk.Config;
  const frames = [];
  const adapter = createMazeMapAdapter({
    Mazemap: state.sdk,
    container: state.container,
    requestAnimationFrame: callback => frames.push(callback),
  });
  await adapter.launch(null, null, {
    campusId: 566,
    center: [170.5, -45.8],
  });
  const pending = adapter.resizeMapSoon();
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.equal(state.map.resizes, 0);
  frames.shift()();
  assert.equal(await pending, true);
  assert.equal(state.map.resizes, 1);
});

test("only a structured map-load denial produces a promptable launch error", async () => {
  const denied = harness("access");
  const adapter = createMazeMapAdapter({
    Mazemap: denied.sdk,
    container: denied.container,
  });
  await assert.rejects(
    adapter.launch(""),
    error => error.classification === "access-denied"
      && error.promptForAccess === true,
  );
  const generic = harness("generic");
  await assert.rejects(
    createMazeMapAdapter({
      Mazemap: generic.sdk,
      container: generic.container,
    }).launch(""),
    error => error.classification === "generic"
      && error.promptForAccess === false,
  );
});

function harness(mode = "load") {
  const state = {
    cameras: [], filters: new Map(), layers: new Map(),
    sdkLoads: 0, sources: new Map(), tokens: [],
  };
  state.container = {
    isConnected: true,
    getBoundingClientRect: () => ({ width: 800, height: 500 }),
  };
  state.documentRef = { getElementById: () => state.container };
  class FakeMap {
    constructor(options) {
      state.map = this;
      this.options = options;
      this.resizes = 0;
      this.zLevel = 0;
    }
    addLayer(value) { state.layers.set(value.id, value); }
    addSource(id, value) {
      state.sources.set(id, { ...value, setData(data) { this.data = data; } });
    }
    easeTo(camera) { state.cameras.push(camera); }
    getBounds() {
      return { getWest: () => 0, getEast: () => 1, getSouth: () => 0, getNorth: () => 1 };
    }
    getLayer(id) { return state.layers.get(id); }
    getSource(id) { return state.sources.get(id); }
    getZLevel() { return this.zLevel; }
    on(type, listener) {
      if (type === "error" && mode === "access") {
        listener({ error: { response: { status: 403 } } });
      } else if (type === "error" && mode === "generic") {
        listener({ error: Error("401 Unauthorized") });
      } else if (type === "load" && mode === "load") listener();
    }
    remove() { this.removed = true; }
    resize() { this.resizes += 1; }
    setFilter(id, filter) { state.filters.set(id, filter); }
    setLayoutProperty() {}
    setPaintProperty() {}
    setZLevel(z) { this.zLevel = z; }
  }
  state.sdk = {
    Config: { setMazemapViewToken: token => state.tokens.push(token) },
    Data: {},
    Map: FakeMap,
  };
  return state;
}

function point(lng, z) {
  return { lng, lat: -45.8, z };
}
