// FEATURE:      Report issue intelligence
// SURFACE:      node --test src/domain/report-insights.test.mjs
// WHY TOGETHER: Field floor, zone, and lag projections freeze the restored Report datasets.
// STATE:        Loaded immutable field result
// RULES:        Duplicate display names retain immutable stop identity and route position.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "./report-analysis.mjs";
import { buildReportInsights } from "./report-insights.mjs";

const result = JSON.parse(await readFile(new URL(
  "../../results/292__566__4a9ba424-a96f-466d-a000-d0ba5d62571e"
    + "__2026-07-30T02-36-21Z.result.v3.json",
  import.meta.url,
)));

test("field insights expose timelines, floor totals, distinct zones, and floor lags", () => {
  const insights = buildReportInsights(result, analyzeReportResult(result));

  assert.equal(insights.timeline.length, 2548);
  assert.deepEqual(
    insights.byFloor.map(floor => floor.affectedSeconds),
    [217.255, 538.678, 272.188, 360.345],
  );
  assert.equal(insights.zones.length, 10);
  assert.equal(new Set(insights.zones.map(zone => zone.id)).size, 10);
  const mapped = insights.zones.filter(zone => zone.name === "Mapped point");
  assert.deepEqual(mapped.map(zone => zone.id), ["stop-33", "stop-35"]);
  assert.notEqual(mapped[0].routeDistanceM, mapped[1].routeDistanceM);
  assert.equal(insights.floorEpisodes.length, 8);
  assert.deepEqual(
    insights.floorEpisodes.map(episode => episode.affectedSeconds),
    [73.038, 79.022, 81.524, 46.443, 29.298, 43.493, 51.317, 32.849],
  );
});
