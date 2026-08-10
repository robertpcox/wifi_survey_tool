// FEATURE:      Campus overview surface
// SURFACE:      node --test src/features/report-player/campus-overview.test.mjs
// WHY TOGETHER: Model building, map projection, and panel states prove one overview surface.
// STATE:        Two analyzed fixtures sharing one corridor
// RULES:        The merged picture feeds the shared map layers without new adapter shapes.
// PROVENANCE:   NDH merged campus picture · problem areas across runs, devices, and days

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import {
  buildCampusOverviewModel,
  overviewMapAnalysis,
  renderCampusOverviewPanel,
} from "./campus-overview.mjs";

const load = async name => JSON.parse(await readFile(
  new URL(`../../../data/fixtures/report-player/${name}`, import.meta.url),
));
const thresholds = { stickySeconds: 2, accuracyM: 5 };
const straight = await load("result.fixture.v3.json");
const outAndBack = await load("result.out-and-back.fixture.v3.json");
const built = buildCampusOverviewModel({
  result: straight,
  analysis: analyzeReportResult(straight, thresholds),
  thresholds,
  others: [outAndBack],
});

test("the merged model paints through the shared map analysis shape", () => {
  const map = built.mapAnalysis;
  assert.deepEqual(map.floors.map(floor => floor.z), [0, 1]);
  assert.equal(map.stalePathSegments.length, built.model.stalePathSegments.length);
  assert.ok(map.stalePathSegments.length > 0);
  assert.ok(map.stalePathSegments.every(segment => segment.resultId));
  assert.ok(map.heatmaps.freeze.every(floor => floor.points.length === 0));
  assert.deepEqual(map.timeline, []);
  assert.deepEqual(map.warnings, { floorMismatch: { points: [] } });
  assert.equal(map.overview, true);
  assert.ok(map.fitPoints.length > 0);
  const sticky = map.heatmaps.sticky.find(floor => floor.z === 0);
  assert.ok(sticky.points.length > 0);
  assert.ok(sticky.points.every(point => point.weight > 0
    && Number.isFinite(point.lng) && Number.isFinite(point.lat)));
  assert.ok(map.heatmaps.lag.some(floor => floor.points.length > 0));
  assert.deepEqual(map.concernSegments, []);
  assert.equal(overviewMapAnalysis(built.model).floors.length, 2);
});

test("room failures fit the map and retain area evidence without point heat", () => {
  const summary = {
    truthIssuePoints: [{
      lng: 170.5, lat: -45.87, z: 0, weight: 2,
    }],
    ciscoIssuePoints: [{
      lng: 170.5002, lat: -45.87, z: 0, weight: 2,
    }],
    areaPolygons: [{ areaKey: "clinic", severity: "bad" }],
  };
  const room = overviewMapAnalysis(built.model, summary);
  assert.ok(room.heatmaps.room.every(floor => floor.points.length === 0));
  assert.equal(room.areaResolution, summary);
  assert.ok(room.fitPoints.some(point => point.lng === 170.5002));
});

test("the panel offers lazy loading, then the merged table", () => {
  const idle = renderCampusOverviewPanel({
    overview: null,
    entryCount: 8,
    loaded: false,
  });
  assert.match(idle, /Problem areas merged across every run/);
  assert.match(idle, /Load and merge all 9 campus runs/);
  assert.match(idle, /data-overview-status/);
  const loaded = renderCampusOverviewPanel({
    overview: built.model,
    entryCount: 1,
    loaded: true,
  });
  assert.match(loaded, /2 runs merged/);
  assert.match(loaded, /both-direction spots/);
  assert.match(loaded, /Both directions/);
  assert.match(loaded, /Ground/);
  assert.doesNotMatch(loaded, /data-load-overview/);
});

test("non-seed overview runs carry their reviewed exceptions into analysis", () => {
  const calls = [];
  buildCampusOverviewModel({
    result: straight,
    analysis: analyzeReportResult(straight, thresholds),
    thresholds,
    others: [{
      result: outAndBack,
      exceptions: [{ disposition: "exclude-interval", id: "review-1" }],
    }],
    analyze(value, selected, exceptions) {
      calls.push([value.run.resultId, selected, exceptions]);
      return analyzeReportResult(value, selected, []);
    },
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], outAndBack.run.resultId);
  assert.equal(calls[0][2][0].id, "review-1");
});

test("an exclude-run seed stays playable but outside the consolidated model", () => {
  const withoutSeed = buildCampusOverviewModel({
    result: straight,
    analysis: analyzeReportResult(straight, thresholds),
    thresholds,
    others: [outAndBack],
    includeResult: false,
  });
  assert.equal(withoutSeed.model.runCount, 1);
  assert.equal(withoutSeed.model.runs[0].resultId, outAndBack.run.resultId);
});
