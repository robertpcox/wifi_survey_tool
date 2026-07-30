// FEATURE:      Report Player analysis visuals
// SURFACE:      node --test src/features/report-player/report-visuals.test.mjs
// WHY TOGETHER: Component-style assertions guard evidence layouts and responsive behavior.
// STATE:        Loaded report visuals CSS
// RULES:        KPI, heat, comparison, playback, and methodology retain named hooks.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("./report-visuals.css", import.meta.url), "utf8");

test("Report Player visuals style every independent evidence module responsively", () => {
  for (const selector of [
    ".kpi-grid",
    ".heat-floor-grid",
    ".threshold-summary",
    ".comparison-table-wrap",
    ".playback-controls",
    ".report-methodology",
  ]) {
    assert.match(css, new RegExp(selector.replace(".", "\\.")));
  }
  assert.match(css, /@media \(max-width: 680px\)/);
});
