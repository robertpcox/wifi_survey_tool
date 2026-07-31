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
  assert.deepEqual(map.stalePathSegments, []);
  assert.deepEqual(map.timeline, []);
  assert.deepEqual(map.warnings, { floorMismatch: { points: [] } });
  const sticky = map.heatmaps.sticky.find(floor => floor.z === 0);
  assert.ok(sticky.points.length > 0);
  assert.ok(sticky.points.every(point => point.weightSeconds > 0
    && Number.isFinite(point.lng) && Number.isFinite(point.lat)));
  assert.ok(map.concernSegments.length > 0);
  for (const segment of map.concernSegments) {
    assert.match(segment.pairId, /^concern:merged:/);
    assert.equal(segment.coordinates.length, 2);
    assert.ok(["centre", "approach-forward", "approach-reverse"]
      .includes(segment.kind));
    assert.ok(Number.isFinite(segment.runCount));
  }
  assert.ok(map.concernSegments.some(segment => segment.kind === "centre"));
  assert.equal(overviewMapAnalysis(built.model).floors.length, 2);
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
