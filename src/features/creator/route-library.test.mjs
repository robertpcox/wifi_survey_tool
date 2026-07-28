import assert from "node:assert/strict";
import test from "node:test";

import { createRouteLibrary } from "./route-library.mjs";

function definition(name, campusId = 566) {
  return {
    campusId,
    name,
    stops: [{
      label: `${name} stop`,
      lat: -36.85,
      lng: 174.76,
      targetType: "point",
      z: 1,
    }],
  };
}

test("createRouteLibrary preserves save, load, busy, and manifest fallback", async () => {
  const routeState = { loadBusy: false, selectionVersion: 0, stops: [] };
  const localRoutes = { Bad: definition("Bad", 999), Local: definition("Local") };
  const saved = [];
  const deleted = [];
  let serverResolve;
  let serverLoads = 0;
  const serverGate = new Promise(resolve => { serverResolve = resolve; });
  const repository = {
    deleteRoute: name => {
      deleted.push(name);
      delete localRoutes[name];
    },
    loadServerRoute: async () => {
      serverLoads++;
      return serverGate;
    },
    loadServerRouteManifest: async () => [
      { file: "server.json", floor: "L1", name: "Server" },
    ],
    saveRoute: (...args) => saved.push(args),
    savedRouteMap: () => localRoutes,
  };
  let selected = "";
  let enteredName = "";
  const calls = {
    busy: [],
    collapsed: 0,
    refresh: [],
    statuses: [],
  };
  const view = {
    collapseMobileConfig: () => calls.collapsed++,
    refreshSavedRoutes: (...args) => calls.refresh.push(args),
    routeName: () => enteredName,
    selectedRoute: () => selected,
    setRouteLoadBusy: value => calls.busy.push(value),
    setStatus: (...value) => calls.statuses.push(value),
  };
  const applied = [];
  const editor = {
    applyRoute(stops, name, increment) {
      routeState.stops = stops;
      if (increment) routeState.selectionVersion++;
      applied.push([stops, name, increment]);
    },
    clearRouteForLoad() {
      routeState.stops = [];
      routeState.selectionVersion = 0;
    },
  };
  const mapAdapter = { ready: false };
  let builds = 0;
  const library = createRouteLibrary({
    buildRoute: async () => {
      builds++;
    },
    editor,
    makeDefinition: name => ({ name }),
    mapAdapter,
    repository,
    routeState,
    view,
  });
  await library.initialize();
  assert.equal(calls.refresh[0][0][0].name, "Server");
  assert.equal(calls.refresh[0][1], localRoutes);
  library.actions.saveRoute();
  assert.match(calls.statuses.at(-1)[1], /Route name and at least one stop/);
  enteredName = "Saved";
  routeState.stops = [definition("Saved").stops[0]];
  library.actions.saveRoute();
  assert.deepEqual(saved, [["Saved", { name: "Saved" }]]);
  assert.equal(calls.refresh.at(-1)[2], "local:Saved");
  selected = "local:Local";
  await library.actions.loadRoute();
  assert.equal(applied.at(-1)[1], "Local");
  assert.equal(routeState.selectionVersion, 1);
  assert.equal(builds, 0);
  assert.match(calls.statuses.at(-1)[1], /waiting for map/);
  mapAdapter.ready = true;
  selected = "server:0";
  const firstLoad = library.actions.loadRoute();
  await Promise.resolve();
  const ignoredLoad = library.actions.loadRoute();
  await ignoredLoad;
  assert.equal(serverLoads, 1);
  assert.equal(routeState.loadBusy, true);
  serverResolve(definition("Server payload"));
  await firstLoad;
  assert.equal(builds, 1);
  assert.equal(routeState.loadBusy, false);
  assert.deepEqual(calls.busy.slice(-2), [true, false]);
  selected = "local:Bad";
  await library.actions.loadRoute();
  assert.match(calls.statuses.at(-1)[1], /does not match campus 566/);
  selected = "server:0";
  library.actions.deleteRoute();
  assert.match(calls.statuses.at(-1)[1], /cannot be deleted in the browser/);
  selected = "local:Local";
  library.actions.deleteRoute();
  assert.deepEqual(deleted, ["Local"]);
  const fallbackRefresh = [];
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const fallback = createRouteLibrary({
      buildRoute: async () => {},
      editor,
      makeDefinition: name => ({ name }),
      mapAdapter,
      repository: {
        ...repository,
        loadServerRouteManifest: async () => {
          throw new Error("offline");
        },
      },
      routeState,
      view: {
        ...view,
        refreshSavedRoutes: (...args) => fallbackRefresh.push(args),
      },
    });
    await fallback.initialize();
  } finally {
    console.warn = originalWarn;
  }
  assert.deepEqual(fallbackRefresh[0][0], []);
  assert.equal(fallbackRefresh[0][1], localRoutes);
});
