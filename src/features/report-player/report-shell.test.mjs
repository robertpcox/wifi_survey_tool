// FEATURE:      Merged Report Player composition
// SURFACE:      node --test src/features/report-player/report-shell.test.mjs
// WHY TOGETHER: One fixture composition proves every independent module receives shared context.
// STATE:        One analyzed fixture
// RULES:        Shell markup contains neither serialized result data nor a token default.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { renderReportShell } from "./report-shell.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("merged shell composes every report and playback module from one fixture", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
  });
  const html = renderReportShell({
    result,
    analysis,
    thresholds: analysis.thresholds,
    comparison: null,
  });
  for (const module of [
    "floor-route", "kpi", "heatmap", "timeline", "comparison", "methodology", "playback",
  ]) {
    assert.match(html, new RegExp(`data-module="${module}"`));
  }
  assert.doesNotMatch(html, /"polls"\s*:|MAP_TOKEN/);
  assert.equal((html.match(/data-report-map/g) ?? []).length, 1);
});
