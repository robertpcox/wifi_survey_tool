// FEATURE:      Report Player analysis
// SURFACE:      Node test for report-analysis-options.mjs
// WHY TOGETHER: Valid options and precise failures prove the shared analysis gate.
// STATE:        Minimal result metadata
// RULES:        Default availability threshold does not weaken floor or numeric validation.
// PROVENANCE:   Scope/contracts/report_analysis.md

import assert from "node:assert/strict";
import test from "node:test";

import { reportAnalysisOptions } from "./report-analysis-options.mjs";

const defaults = { noPositionSeconds: 30 };
const result = { meta: { zLevels: [0], zLevelNames: { "0": "Ground" } } };

test("analysis options normalize thresholds and configured floors", () => {
  assert.deepEqual(
    reportAnalysisOptions(
      result,
      { stickySeconds: 15, accuracyM: 10 },
      defaults,
    ),
    {
      floors: [{ z: 0, name: "Ground" }],
      thresholds: { stickySeconds: 15, accuracyM: 10, noPositionSeconds: 30 },
    },
  );
});

test("negative thresholds and unnamed floors reject", () => {
  assert.throws(
    () => reportAnalysisOptions(result, { stickySeconds: -1, accuracyM: 10 }, defaults),
    /stickySeconds/,
  );
  assert.throws(
    () => reportAnalysisOptions(
      { meta: { zLevels: [1], zLevelNames: {} } },
      { stickySeconds: 15, accuracyM: 10 },
      defaults,
    ),
    /must name every configured floor/,
  );
});
