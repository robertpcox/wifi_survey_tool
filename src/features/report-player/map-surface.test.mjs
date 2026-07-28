// FEATURE:      Report Player shared MazeMap surface
// SURFACE:      node --test src/features/report-player/map-surface.test.mjs
// WHY TOGETHER: Public retry, adapter reuse, stable fit, resize, and fallback share one lifecycle.
// STATE:        Fake adapter, ResizeObserver, animation frames, and fallback canvas
// RULES:        A retry reuses the original adapter and generic failure exposes only fallback.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createReportMapSurface } from "./map-surface.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("public denial retries on one observed adapter then resizes and fits", async () => {
  const calls = [];
  let creations = 0;
  let launches = 0;
  let observer;
  class FakeResizeObserver {
    constructor(callback) { observer = this; this.callback = callback; }
    observe(value) { calls.push(["observe", value]); }
    disconnect() { calls.push(["disconnect"]); }
  }
  const adapter = fakeAdapter(calls, async (token, _unused, options) => {
    launches += 1;
    calls.push(["launch", token, options.campusId, options.container]);
    if (launches === 1) {
      throw Object.assign(new Error("Unauthorized"), {
        classification: "access-denied",
        promptForAccess: true,
      });
    }
  });
  const elements = mapElements();
  const surface = createReportMapSurface({
    result,
    ...elements,
    createMap: () => { creations += 1; return adapter; },
    ResizeObserverRef: FakeResizeObserver,
    requestFrame: callback => callback(),
  });
  const denied = await surface.start();
  assert.equal(denied.status, "access-denied");
  assert.deepEqual(calls[0], ["observe", elements.mapElement.parentElement]);
  const ready = await surface.retryAccess("typed-at-runtime");
  assert.equal(ready.status, "ready");
  assert.equal(creations, 1);
  assert.deepEqual(calls.filter(call => call[0] === "launch").map(call => call[1]), [
    null,
    "typed-at-runtime",
  ]);
  assert.equal(elements.mapElement.hidden, false);
  assert.equal(elements.fallbackElement.hidden, true);
  surface.setViewMode("playback");
  surface.followWalker({ lng: 170.5, lat: -45.87, z: 1 });
  assert.ok(calls.some(call => call[0] === "follow" && call[1].z === 1));
  assert.ok(calls.some(call => call[0] === "resize"));
  assert.ok(calls.some(call => call[0] === "fit" && call[1] === result.route));
  await observer.callback();
  assert.ok(calls.filter(call => call[0] === "fit").length >= 2);
  surface.destroy();
  assert.ok(calls.some(call => call[0] === "disconnect"));
});

test("generic launch failure labels and draws the route fallback", async () => {
  const calls = [];
  const elements = mapElements();
  const surface = createReportMapSurface({
    result,
    ...elements,
    createMap: () => fakeAdapter(calls, async () => {
      throw new TypeError("SDK unavailable");
    }),
    ResizeObserverRef: null,
    requestFrame: callback => callback(),
  });
  const outcome = await surface.start();
  assert.equal(outcome.status, "fallback");
  assert.equal(surface.mapMode, "fallback");
  assert.equal(elements.mapElement.hidden, true);
  assert.equal(elements.fallbackElement.hidden, false);
  assert.match(elements.statusElement.textContent, /labelled route fallback active/);
  assert.ok(elements.canvas.contextCalls.includes("clearRect"));
});

function fakeAdapter(calls, launch) {
  return {
    launch,
    drawRoute: value => calls.push(["route", value]),
    drawStops: value => calls.push(["stops", value]),
    drawWaypoints: value => calls.push(["waypoints", value]),
    drawReportHeat: (...value) => calls.push(["heat", ...value]),
    drawPlayerFrame: (...value) => calls.push(["player", ...value]),
    disablePlayerLayers: () => calls.push(["disable-player"]),
    followWalker: value => calls.push(["follow", value]),
    fitRoute: value => calls.push(["fit", value]),
    resizeMapSoon: () => calls.push(["resize"]),
    setMapZLevel: value => calls.push(["floor", value]),
    setViewMode: value => calls.push(["mode", value]),
  };
}

function mapElements() {
  const contextCalls = [];
  const context = new Proxy({}, {
    get: (_target, key) => (..._args) => contextCalls.push(String(key)),
    set: () => true,
  });
  return {
    canvas: {
      width: 900, height: 460, contextCalls,
      getContext: () => context,
    },
    mapElement: { hidden: false, parentElement: { id: "map-stage" } },
    fallbackElement: { hidden: true },
    statusElement: { textContent: "" },
  };
}
