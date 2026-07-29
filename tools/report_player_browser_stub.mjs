// FEATURE:      Report Player browser acceptance
// SURFACE:      installReportPlayerMazeMapStub(page, origin, scenario)
// WHY TOGETHER: Fake SDK, recorded launch modes, and external-request blocking make Chrome deterministic.
// STATE:        window.__reportMapState and one or more fake map construction attempts
// RULES:        Permit repository requests only and never send entered access to a network.
// PROVENANCE:   Scope/test_plan.md Step 5a browser gates

import { respondReportPlayerRequest } from "./report_player_browser_data.mjs";

export async function installReportPlayerMazeMapStub(
  page,
  origin,
  scenario = "public",
  fixture = null,
) {
  await page.evaluateOnNewDocument(installMazemap, scenario);
  await page.setRequestInterception(true);
  page.on("request", request => {
    void respondReportPlayerRequest(request, origin, fixture);
  });
}

function installMazemap(scenario) {
  const state = window.__reportMapState = {
    cameras: [],
    fits: [],
    instances: 0,
    resizes: 0,
    scenario,
    tokens: [],
  };
  class Source {
    constructor(data) { this.data = data; this.updates = 0; }
    setData(data) { this.data = data; this.updates += 1; }
  }
  class MapStub {
    constructor(options) {
      state.instances += 1;
      state.map = this;
      this.events = {};
      this.layers = new Map();
      this.options = options;
      this.sources = new Map();
      this.zLevel = 1;
      this.zoom = 18;
    }
    on(name, callback) {
      this.events[name] = callback;
      if (name === "error" && shouldFail()) {
        setTimeout(() => callback({ error: fixtureError() }), 0);
      } else if (name === "load" && !shouldFail()) {
        setTimeout(callback, 0);
      }
    }
    addSource(id, definition) { this.sources.set(id, new Source(definition.data)); }
    getSource(id) { return this.sources.get(id); }
    addLayer(layer) { this.layers.set(layer.id, { ...layer }); }
    getLayer(id) { return this.layers.get(id); }
    getZLevel() { return this.zLevel; }
    setZLevel(value) { this.zLevel = value; }
    getBounds() {
      return {
        getEast: () => 1,
        getNorth: () => 1,
        getSouth: () => 0,
        getWest: () => 0,
      };
    }
    getZoom() { return this.zoom; }
    easeTo(camera) {
      this.camera = camera;
      state.cameras.push(structuredClone(camera));
    }
    flyTo(camera) {
      this.camera = camera;
      state.cameras.push(structuredClone(camera));
    }
    fitBounds(bounds, options) { state.fits.push({ bounds, options }); }
    remove() { this.removed = true; }
    resize() { state.resizes += 1; }
    setFilter(id, filter) { this.layers.get(id).filter = filter; }
    setLayoutProperty(id, key, value) { this.layers.get(id).layout[key] = value; }
    setPaintProperty(id, key, value) { this.layers.get(id).paint[key] = value; }
    stop() {}
  }
  function shouldFail() {
    return scenario !== "public"
      && !(scenario === "access-denied" && state.tokens.length);
  }
  function fixtureError() {
    if (scenario === "access-denied") {
      return Object.assign(new Error("MazeMap request denied"), {
        response: { status: 401 },
      });
    }
    if (scenario === "network-failure") return new TypeError("Failed to fetch MazeMap tiles");
    return new Error("Unknown MazeMap fixture failure");
  }
  window.Mazemap = {
    Config: {
      setMazemapViewToken(value) {
        if (value) state.tokens.push(value);
      },
    },
    Data: {},
    Map: MapStub,
  };
}
