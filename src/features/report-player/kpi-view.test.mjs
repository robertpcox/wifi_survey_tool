// FEATURE:      Report Player KPI summary
// SURFACE:      node --test src/features/report-player/kpi-view.test.mjs
// WHY TOGETHER: Shared-fixture metric labels and values prove this independent renderer.
// STATE:        One analyzed fixture
// RULES:        The view receives analysis and performs no domain calculations.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { renderKpiView } from "./kpi-view.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("KPI section renders one shared fixture analysis", () => {
  const html = renderKpiView(analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
  }));
  assert.match(html, /Run at a glance/);
  assert.match(html, /Sticky while moving/);
  assert.match(html, /Outside tolerance/);
  assert.match(html, /Median RTT/);
});
