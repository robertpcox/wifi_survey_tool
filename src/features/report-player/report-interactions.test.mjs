// FEATURE:      Merged Report Player interactions
// SURFACE:      node --test src/features/report-player/report-interactions.test.mjs
// WHY TOGETHER: One fixture proves dynamic modules render from one shared store snapshot.
// STATE:        Analyzed fixture snapshot
// RULES:        Pure rendering performs no load, parse, mutation, download, or timer work.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import {
  renderDynamicSections,
} from "./report-interactions.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("dynamic analysis sections independently render one shared fixture snapshot", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
  });
  const sections = renderDynamicSections({
    result,
    analysis,
    thresholds: analysis.thresholds,
    comparison: null,
  }, []);
  assert.deepEqual(
    Object.keys(sections),
    [
      "mapAlerts", "warnings", "kpi", "insights", "direction", "heatmap",
      "noPosition", "comparison", "methodology",
    ],
  );
  assert.equal(sections.mapAlerts, "");
  assert.match(sections.warnings, /Observed warnings/);
  assert.match(sections.kpi, /Run at a glance/);
  assert.match(sections.noPosition, /Where coverage effectively dropped out/);
  assert.match(sections.insights, /The walk, second by second/);
  assert.match(sections.direction, /Where the corridor is problematic from both entry directions/);
  assert.match(sections.heatmap, /Where it gets stuck/);
  assert.match(sections.comparison, /Same route, different device/);
  assert.match(sections.methodology, /Methodology and export/);
});
