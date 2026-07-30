// FEATURE:      Report issue summaries
// SURFACE:      node --test src/features/report-player/report-summary.test.mjs
// WHY TOGETHER: Summary CSS checks protect ranked bars, tables, and responsive stacking.
// STATE:        Authored stylesheet text
// RULES:        Exact values remain readable alongside proportional bars.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./report-summary.css", import.meta.url), "utf8");

test("summary stylesheet exposes ranked bars, table scrolling, and narrow stacking", () => {
  assert.match(css, /--issue-width/);
  assert.match(css, /\.report-table-scroll/);
  assert.match(css, /grid-template-columns:\s*1fr/);
});
