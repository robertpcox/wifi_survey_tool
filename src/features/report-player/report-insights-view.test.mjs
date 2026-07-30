// FEATURE:      Report issue intelligence
// SURFACE:      node --test src/features/report-player/report-insights-view.test.mjs
// WHY TOGETHER: The composition proves loaded result evidence reaches every restored Report block.
// STATE:        Parsed result fixture
// RULES:        Render from shared analysis without a second parse or hidden chronology log.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { renderReportInsights } from "./report-insights-view.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("insight composition restores diagnostic and location data", () => {
  const analysis = analyzeReportResult(result, { stickySeconds: 2, accuracyM: 5 });
  const html = renderReportInsights({ result, analysis });
  assert.match(html, /The walk, second by second/);
  assert.match(html, /Where position updates get stuck/);
  assert.match(html, /Floor changes lag behind/);
  assert.doesNotMatch(html, /data-module="timeline"/);
});
