// FEATURE:      Report analysis browser acceptance
// SURFACE:      node --test tools/report_player_browser_analysis.test.mjs
// WHY TOGETHER: The staged Chrome gate imports one stable Report-analysis exercise.
// STATE:        None
// RULES:        Full behavior runs in the staged browser smoke, not a simulated DOM.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import test from "node:test";

import { exerciseReportAnalysis } from "./report_player_browser_analysis.mjs";

test("Report analysis Chrome exercise remains callable", () => {
  assert.equal(typeof exerciseReportAnalysis, "function");
});
