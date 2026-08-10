// FEATURE:      Consolidated MazeMap area polygon presentation
// SURFACE:      node --test src/adapters/map/report-area-polygon-features.test.mjs
// WHY TOGETHER: Binary majority, tie, and unscored fills share one visual contract.
// STATE:        Synthetic area aggregates
// RULES:        Any strict pass majority is green; only an exact split is amber.
// PROVENANCE:   Campus area-resolution map

import assert from "node:assert/strict";
import test from "node:test";

import { presentationSeverity } from "./report-area-polygon-features.mjs";

test("polygon fill uses strict majority rather than requiring zero failures", () => {
  assert.equal(presentationSeverity({
    insideSampleCount: 6, outsideSampleCount: 4, severity: "mixed",
  }), "good");
  assert.equal(presentationSeverity({
    insideSampleCount: 4, outsideSampleCount: 6, severity: "mixed",
  }), "bad");
  assert.equal(presentationSeverity({
    insideSampleCount: 5, outsideSampleCount: 5, severity: "good",
  }), "mixed");
  assert.equal(presentationSeverity({
    insideSampleCount: 0, outsideSampleCount: 0, severity: "bad",
  }), "unscored");
});
