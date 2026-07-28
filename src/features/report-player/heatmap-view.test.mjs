// FEATURE:      Report Player threshold heatmaps
// SURFACE:      node --test src/features/report-player/heatmap-view.test.mjs
// WHY TOGETHER: Fixture controls, floors, and heat totals prove one independent renderer.
// STATE:        One analyzed fixture
// RULES:        Both named meta floors render even when one has no heat.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { renderHeatmapView } from "./heatmap-view.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("heatmap view renders live thresholds and every meta floor", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
  });
  const html = renderHeatmapView({ analysis, thresholds: analysis.thresholds });
  assert.match(html, /data-threshold="stickySeconds"/);
  assert.match(html, /data-threshold="accuracyM"/);
  assert.match(html, />Ground</);
  assert.match(html, />First</);
  assert.match(html, /Sticky heat/);
  assert.match(html, /Accuracy heat/);
});
