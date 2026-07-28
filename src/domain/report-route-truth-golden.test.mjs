// FEATURE:      Report Player route truth
// SURFACE:      Node test for report-route-truth-golden.mjs
// WHY TOGETHER: Authorized field input and reviewed golden prove the corrected model.
// STATE:        Read-only authorized result and committed before/after golden
// RULES:        The test reads but never stages or publishes the physical field result.
// PROVENANCE:   Scope/steps/05a_recast_player.md before/after golden acceptance

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { summarizeRouteTruthAnalysis } from "./report-route-truth-golden.mjs";

const fieldResult = JSON.parse(await readFile(new URL(
  "../../results/292__566__5ef73912-3851-406a-81cc-93ca19cec12b__2026-07-28T09-00-54Z.result.v3.json",
  import.meta.url,
)));
const golden = JSON.parse(await readFile(new URL(
  "../../data/fixtures/report-player/route-truth-analysis.golden.json",
  import.meta.url,
)));

test("authorized field result matches reviewed cumulative-route golden", () => {
  assert.deepEqual(summarizeRouteTruthAnalysis(fieldResult), golden.after);
  assert.deepEqual(
    {
      stickyPointCount: golden.before.sticky.pointCount,
      stickySeconds: golden.before.sticky.seconds,
      accuracyPointCount: golden.before.accuracy.pointCount,
      accuracySeconds: golden.before.accuracy.seconds,
    },
    {
      stickyPointCount: 25,
      stickySeconds: 60.028,
      accuracyPointCount: 2,
      accuracySeconds: 2.963,
    },
  );
  assert.equal(golden.review.classificationDurationsChanged, false);
  assert.equal(golden.review.routeTruthChanged, true);
});
