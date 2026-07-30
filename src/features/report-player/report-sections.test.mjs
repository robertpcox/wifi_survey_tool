// FEATURE:      Merged Report Player composition
// SURFACE:      node --test src/features/report-player/report-sections.test.mjs
// WHY TOGETHER: Section keys and all-runs pass-through prove one snapshot renderer.
// STATE:        Analyzed fixture snapshot
// RULES:        Pure rendering performs no load, parse, mutation, or timer work.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { renderDynamicSections } from "./report-sections.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("sections render in diagnostic order and carry the all-runs state", () => {
  const analysis = analyzeReportResult(result, { stickySeconds: 2, accuracyM: 5 });
  const sections = renderDynamicSections(
    { result, analysis, thresholds: analysis.thresholds, comparison: null },
    [],
    { entryCount: 2, loaded: false, rows: [] },
  );
  assert.deepEqual(
    Object.keys(sections),
    [
      "mapAlerts", "warnings", "kpi", "insights", "direction", "heatmap",
      "noPosition", "comparison", "methodology",
    ],
  );
  assert.match(sections.comparison, /Load all 3 campus runs/);
  assert.match(sections.comparison, /No same-route sibling runs/);
  assert.match(sections.noPosition, /Where coverage effectively dropped out/);
});
