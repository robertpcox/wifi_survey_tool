// FEATURE:      Report issue intelligence
// SURFACE:      node --test src/features/report-player/report-insights.test.mjs
// WHY TOGETHER: Diagnostic CSS checks protect chart, outage, and narrow-screen readability.
// STATE:        Authored stylesheet text
// RULES:        Request failure and threshold marks remain distinct.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./report-insights.css", import.meta.url), "utf8");

test("diagnostic stylesheet distinguishes series, thresholds, failures, and mobile overflow", () => {
  assert.match(css, /\.chart-series/);
  assert.match(css, /\.chart-threshold/);
  assert.match(css, /\.chart-outage/);
  assert.match(css, /\.request-summary/);
  assert.match(css, /overflow-x:\s*auto/);
});
