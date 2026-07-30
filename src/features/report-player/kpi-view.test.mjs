// FEATURE:      Report Player KPI summary
// SURFACE:      node --test src/features/report-player/kpi-view.test.mjs
// WHY TOGETHER: Lane labels and the confidence headline prove this independent renderer.
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

test("KPI section renders accuracy, freshness, and availability lanes", () => {
  const html = renderKpiView(analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
  }));
  assert.match(html, /Run at a glance/);
  assert.equal((html.match(/class="kpi-lane"/g) ?? []).length, 3);
  assert.match(html, /Accuracy/);
  assert.match(html, /unique fixes scored at their fix time/);
  assert.match(html, /Freshness/);
  assert.match(html, /No fresh fix while moving/);
  assert.match(html, /Availability/);
  assert.match(html, /Median RTT/);
  assert.match(
    html,
    /1 of 3 unique fixes \(33\.3%\) landed within the provider's own confidence radius\./,
  );
  assert.match(html, /Within provider confidence/);
  assert.match(html, /3 of 3 scored/);
  assert.match(html, /Lag behind \(median \/ p95\)/);
  assert.match(html, /Effectively no position \(&gt; 30 s old\)/);
});

test("a run without provider confidence keeps an honest headline", () => {
  const stripped = structuredClone(result);
  for (const poll of stripped.polls) delete poll.normalized.confidence;
  const html = renderKpiView(analyzeReportResult(stripped, {
    stickySeconds: 2,
    accuracyM: 5,
  }));
  assert.match(html, /reported no confidence radius/);
  assert.match(html, /Within provider confidence<\/dt><dd>—<\/dd>/);
});
