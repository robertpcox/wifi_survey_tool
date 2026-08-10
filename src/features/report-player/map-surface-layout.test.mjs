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

test("overview fit uses aggregate points instead of the seed route", async () => {
  const fitted = [];
  const aggregate = routeForMapAnalysis({
    overview: true,
    fitPoints: [{ lng: 3, lat: 4, z: 1 }],
  }, result.route);
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
  assert.equal(routeForMapAnalysis({}, result.route), result.route);
  assert.deepEqual(routeForMapAnalysis({ overview: true }, result.route), { legs: [] });
});
