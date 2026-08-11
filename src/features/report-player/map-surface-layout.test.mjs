// FEATURE:      Report Player shared map layout
// SURFACE:      node --test src/features/report-player/map-surface-layout.test.mjs
// WHY TOGETHER: Route center, observed resize, stable fit, and guarded construction share map layout.
// STATE:        Fake animation frames, ResizeObserver, adapter calls, and fixture route
// RULES:        Resize and exact route fit occur after two layout frames without constructing another map.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createMapSurfaceLayout,
  routeCenter,
  routeForMapAnalysis,
  safelyCreateMap,
} from "./map-surface-layout.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("observed layout waits two frames then resizes and fits the exact route", async () => {
  const calls = [];
  let observer;
  class FakeResizeObserver {
    constructor(callback) { observer = this; this.callback = callback; }
    observe(value) { calls.push(["observe", value]); }
    disconnect() { calls.push(["disconnect"]); }
  }
  const parentElement = { id: "map-stage" };
  const requestFrame = callback => { calls.push(["frame"]); callback(); };
  const layout = createMapSurfaceLayout({
    adapter: {
      resizeMapSoon: () => new Promise(resolve => requestFrame(() => requestFrame(() => {
        calls.push(["resize"]);
        resolve();
      }))),
      fitRoute: value => calls.push(["fit", value]),
    },
    mapElement: { parentElement },
    route: result.route,
    ResizeObserverRef: FakeResizeObserver,
  });
  assert.deepEqual(calls, [["observe", parentElement]]);
  await layout.settle();
  assert.deepEqual(calls.slice(1), [
    ["frame"], ["frame"], ["resize"], ["fit", result.route],
  ]);
  await observer.callback();
  assert.equal(calls.filter(call => call[0] === "fit").length, 2);
  layout.disconnect();
  assert.deepEqual(calls.at(-1), ["disconnect"]);
});

test("route center and guarded construction use fixture geography without throwing", () => {
  assert.deepEqual(routeCenter(result.route), [170.5002, -45.87]);
  const adapter = {};
  assert.deepEqual(safelyCreateMap(() => adapter), { adapter, error: null });
  const error = new Error("SDK absent");
  assert.deepEqual(safelyCreateMap(() => { throw error; }), { adapter: null, error });
});

test("overview fit uses only the selected highlight on the visible floor", async () => {
  const fitted = [];
  const overview = {
    overview: true,
    fitPoints: [{ lng: 99, lat: 99, z: 1 }],
    heatmaps: { sticky: [
      { z: 0, points: [{ lng: 1, lat: 2, z: 0 }] },
      { z: 1, points: [{ lng: 3, lat: 4, z: 1 }] },
    ] },
  };
  const aggregate = routeForMapAnalysis(overview, result.route, {
    floor: 1, heatKind: "sticky", overview: true,
  });
  const layout = createMapSurfaceLayout({
    adapter: {
      fitRoute: route => fitted.push(route),
      resizeMapSoon: async () => {},
    },
    route: result.route,
  });
  layout.setRoute(aggregate);
  await layout.settle();
  assert.equal(fitted[0], aggregate);
  assert.deepEqual(aggregate.legs[0].geometry, [{ lng: 3, lat: 4, z: 1 }]);
  assert.equal(routeForMapAnalysis({}, result.route), result.route);
  assert.deepEqual(routeForMapAnalysis({}, result.route, { overview: true }), { legs: [] });
  assert.deepEqual(routeForMapAnalysis(overview, result.route, {
    floor: 4, overview: true,
  }), { legs: [] });
});

test("freeze and room fits use their visible geometry rather than hidden heat", () => {
  const freeze = routeForMapAnalysis({
    overview: true,
    stalePathSegments: [
      { z: 0, coordinates: [[1, 2], [3, 4]] },
      { z: 1, coordinates: [[5, 6], [7, 8]] },
    ],
  }, result.route, { floor: 1, heatKind: "freeze", overview: true });
  assert.deepEqual(freeze.legs[0].geometry, [
    { lng: 5, lat: 6, z: 1 }, { lng: 7, lat: 8, z: 1 },
  ]);
  const room = routeForMapAnalysis({ overview: true, areaResolution: {
    areaPolygons: [{ z: 1, scoredSampleCount: 2, resolutionPercent: 50,
      geometry: { type: "Polygon", coordinates: [[
      [10, 11], [12, 11], [12, 13], [10, 11],
    ]] } }, { z: 1, scoredSampleCount: 0, resolutionPercent: 0,
      geometry: { type: "Polygon", coordinates: [[
        [70, 71], [72, 71], [72, 73], [70, 71],
      ]] } }],
    areaObservations: [{
      observationKind: "dwell", target: { lng: 14, lat: 15, z: 1 },
      primary: { status: "resolved", point: { lng: 14, lat: 15, z: 1 } },
      windowExit: { status: "wrong-room", point: { lng: 16, lat: 17, z: 1 } },
    }, {
      observationKind: "corridor", target: { lng: 50, lat: 50, z: 1 },
      primary: { status: "resolved", point: { lng: 51, lat: 51, z: 1 } },
    }],
  } }, result.route, { floor: 1, heatKind: "room", overview: true });
  assert.ok(room.legs[0].geometry.some(point => point.lng === 10));
  assert.ok(room.legs[0].geometry.some(point => point.lng === 16));
  assert.ok(!room.legs[0].geometry.some(point => point.lng === 50));
  assert.ok(!room.legs[0].geometry.some(point => point.lng === 70));
});

test("a superseded layout fit cannot move the camera to stale data", async () => {
  const gates = [];
  const fitted = [];
  const layout = createMapSurfaceLayout({
    adapter: {
      resizeMapSoon: () => new Promise(resolve => gates.push(resolve)),
      fitRoute: route => fitted.push(route),
    },
    route: result.route,
  });
  const stale = layout.settle();
  const currentRoute = { legs: [{ geometry: [{ lng: 3, lat: 4, z: 1 }] }] };
  layout.setRoute(currentRoute);
  const current = layout.settle();
  gates[0]();
  await stale;
  assert.deepEqual(fitted, []);
  gates[1]();
  await current;
  assert.deepEqual(fitted, [currentRoute]);
});
