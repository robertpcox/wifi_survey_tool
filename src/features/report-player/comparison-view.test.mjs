// FEATURE:      Same-survey result comparison
// SURFACE:      node --test src/features/report-player/comparison-view.test.mjs
// WHY TOGETHER: Fixture candidate, device, delta, baseline, and comment rendering prove this view.
// STATE:        Domain comparison of two fixture variants
// RULES:        Every rendered value and delta carries its run label.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { compareReportResults } from "../../domain/report-comparison.mjs";
import { renderComparisonView } from "./comparison-view.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("comparison view labels baseline, values, deltas, device bands, and comments", () => {
  const candidate = structuredClone(result);
  candidate.run.resultId = "result-report-2";
  candidate.run.startedAt = "2026-07-28T01:00:00.500Z";
  candidate.run.device.name = "Second handset";
  candidate.run.band = "6";
  candidate.run.operatorComment = "Second run note.";
  const comparison = compareReportResults([candidate, result], {
    stickySeconds: 2,
    accuracyM: 5,
  });
  const html = renderComparisonView({ comparison });
  assert.match(html, /Oldest · baseline/);
  assert.match(html, /Second handset · FixtureOS 1 · band 6/);
  assert.match(html, /Second run note/);
  assert.match(html, /Δ 0 · mobile · Second handset/);
  assert.match(html, /Accuracy · unique fixes at fix time/);
  assert.match(html, /Within provider confidence \(%\)/);
  assert.match(html, /Freshness · cloud pipeline/);
  assert.match(html, /Lag behind median \(m\)/);
  assert.match(html, /Effective no position \(%\)/);
  assert.match(html, /Legacy blended · per poll at receipt/);
  assert.equal((html.match(/class="comparison-group"/g) ?? []).length, 4);
});
