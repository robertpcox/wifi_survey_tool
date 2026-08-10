// FEATURE:      Campus overview surface
// SURFACE:      node --test src/features/report-player/campus-overview-controller.test.mjs
// WHY TOGETHER: Load progress, rebuilds, floor options, and mode-aware analysis prove one lifecycle.
// STATE:        Injected loader, store snapshot, and fake floor select
// RULES:        Nothing merges before load; the overview analysis only serves overview mode.
// PROVENANCE:   NDH merged campus picture · problem areas across runs, devices, and days

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { createCampusOverviewController } from "./campus-overview-controller.mjs";

const load = async name => JSON.parse(await readFile(
  new URL(`../../../data/fixtures/report-player/${name}`, import.meta.url),
));
const thresholds = { stickySeconds: 2, accuracyM: 5, noPositionSeconds: 30 };
const straight = await load("result.fixture.v3.json");
const outAndBack = await load("result.out-and-back.fixture.v3.json");

test("controller merges after load, extends floors, and serves overview mode", async () => {
  const analysis = analyzeReportResult(straight, thresholds);
  const store = {
    snapshot: () => ({ result: straight, analysis, thresholds }),
  };
  let loaded = false;
  const loader = {
    load: async onProgress => {
      onProgress?.(1, 1);
      loaded = true;
    },
    results: () => [outAndBack],
    records: () => [{ result: outAndBack, exceptions: [] }],
    get loaded() { return loaded; },
    get entryCount() { return 1; },
  };
  const added = [];
  const floorInput = {
    options: [{ value: "0" }],
    insertAdjacentHTML: (_position, html) => added.push(html),
  };
  const controller = createCampusOverviewController({ store, loader, floorInput });
  assert.equal(controller.loaded, false);
  assert.equal(controller.rebuild(), null);
  const emptyOverview = controller.mapAnalysis("overview", analysis);
  assert.equal(emptyOverview.overview, true);
  assert.deepEqual(emptyOverview.fitPoints, []);
  assert.deepEqual(Object.keys(emptyOverview.heatmaps), [
    "freeze", "sticky", "lag", "accuracy", "room",
  ]);
  assert.ok(Object.values(emptyOverview.heatmaps)
    .every(floors => floors.every(floor => floor.points.length === 0)));
  assert.equal(emptyOverview.areaResolution, null);
  assert.match(controller.panelHtml(), /Load and merge all 2 campus runs/);

  const progress = [];
  const listeners = {};
  controller.bindLoadAction({
    querySelector: selector => (selector === "[data-load-overview]"
      ? { addEventListener: (name, fn) => { listeners[name] = fn; } }
      : { textContent: "", set textContent(v) { progress.push(v); } }),
  }, () => progress.push("refreshed"));
  await listeners.click();
  assert.equal(controller.loaded, true);
  assert.deepEqual(added, ['<option value="1">First</option>']);
  const overviewAnalysis = controller.mapAnalysis("overview", analysis);
  assert.notEqual(overviewAnalysis, analysis);
  assert.deepEqual(overviewAnalysis.concernSegments, []);
  controller.setRoomSummary({
    truthIssuePoints: [{ lng: 170.5, lat: -45.87, z: 0, weight: 1 }],
    ciscoIssuePoints: [{ lng: 170.6, lat: -45.87, z: 0, weight: 1 }],
  });
  assert.equal(controller.mapAnalysis("overview", analysis)
    .heatmaps.room[0].points.length, 1);
  assert.equal(controller.mapAnalysis("overview", analysis)
    .heatmaps.room[0].points[0].lng, 170.6);
  assert.equal(controller.mapAnalysis("analysis", analysis), analysis);
  assert.match(controller.panelHtml(), /2 runs merged/);
  assert.equal(progress.at(-1), "refreshed");
});
