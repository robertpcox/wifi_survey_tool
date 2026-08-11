// FEATURE:      Consolidated report camera fit lifecycle
// SURFACE:      node --test src/features/report-player/map-surface-fit.test.mjs
// WHY TOGETHER: Initial overview, highlight, floor, selection, and room enrichment share one camera.
// STATE:        Fake MazeMap adapter fit calls and active overview analysis
// RULES:        Fit visible selected evidence only; empty floors never restore the seed route.
// PROVENANCE:   Campus report bounding-box feedback

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createReportMapSurface } from "./map-surface.mjs";

const result = JSON.parse(await readFile(new URL(
  "../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url,
)));

test("overview camera follows visible-floor highlight, selection, and room evidence", async () => {
  const fits = [];
  const adapter = fakeAdapter(fits);
  const surface = createReportMapSurface({
    result, ...elements(), createMap: () => adapter, ResizeObserverRef: null,
  });
  surface.render({ analysis: overview({ stickyLng: 10, accuracyLng: 20 }) });
  surface.setViewMode("overview");
  await surface.start();
  assert.deepEqual(fitLngs(fits.at(-1)), [11]);

  surface.render({ heatKind: "accuracy" });
  await surface.settleLayout();
  assert.deepEqual(fitLngs(fits.at(-1)), [21]);

  adapter.changeFloor(0);
  await surface.settleLayout();
  assert.deepEqual(fitLngs(fits.at(-1)), [20]);

  surface.render({ heatKind: "sticky" });
  await surface.settleLayout();
  assert.deepEqual(fitLngs(fits.at(-1)), [10]);

  surface.render({ analysis: overview({ stickyLng: 30, accuracyLng: 40 }) });
  await surface.settleLayout();
  assert.deepEqual(fitLngs(fits.at(-1)), [30]);

  surface.render({ floor: 1, heatKind: "room", analysis: roomOverview() });
  await surface.settleLayout();
  assert.ok(fitLngs(fits.at(-1)).includes(50));
  assert.ok(fitLngs(fits.at(-1)).includes(56));

  surface.render({ floor: 4 });
  await surface.settleLayout();
  assert.deepEqual(fits.at(-1), { legs: [] });
  assert.notEqual(fits.at(-1), result.route);
  surface.destroy();
});

function overview({ stickyLng, accuracyLng }) {
  return {
    overview: true,
    heatmaps: {
      sticky: [
        { z: 0, points: [point(stickyLng, 0)] },
        { z: 1, points: [point(stickyLng + 1, 1)] },
      ],
      accuracy: [
        { z: 0, points: [point(accuracyLng, 0)] },
        { z: 1, points: [point(accuracyLng + 1, 1)] },
      ],
    },
  };
}

function roomOverview() {
  return { overview: true, areaResolution: {
    areaPolygons: [{
      z: 1, scoredSampleCount: 2, resolutionPercent: 50,
      geometry: { type: "Polygon", coordinates: [[
        [50, -45], [52, -45], [52, -46], [50, -45],
      ]] },
    }],
    areaObservations: [{
      observationKind: "corridor", target: point(54, 1),
      primary: { status: "wrong-room", point: point(56, 1) },
    }],
  } };
}

function point(lng, z) {
  return { lng, lat: -45, z, weight: 1 };
}

function fitLngs(route) {
  return route.legs.flatMap(leg => leg.geometry).map(item => item.lng);
}

function fakeAdapter(fits) {
  let floorCallback = null;
  return {
    launch: async () => 1,
    drawRoute() {}, drawStops() {}, drawWaypoints() {}, drawReportNotes() {},
    drawReportHeat() {}, disablePlayerLayers() {},
    fitRoute(route) { fits.push(route); return Boolean(route.legs?.length); },
    getMapZLevel: () => 1,
    changeFloor(value) { floorCallback?.(value); },
    resizeMapSoon: async () => {},
    setMapZLevel() {}, setViewMode() {},
    startZWatch(callback) { floorCallback = callback; return () => { floorCallback = null; }; },
    get currentZLevel() { return 1; },
  };
}

function elements() {
  const context = new Proxy({}, {
    get: () => () => {}, set: () => true,
  });
  return {
    canvas: { width: 900, height: 460, getContext: () => context },
    mapElement: { hidden: false, parentElement: {} },
    fallbackElement: { hidden: true }, statusElement: { textContent: "" },
  };
}
