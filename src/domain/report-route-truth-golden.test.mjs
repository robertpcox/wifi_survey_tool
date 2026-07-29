// FEATURE:      Report Player route truth
// SURFACE:      Node receipt test for route-truth-analysis.golden.json
// WHY TOGETHER: Reviewed before/after values remain explicit after private input removal.
// STATE:        Committed reviewed receipt only
// RULES:        The build never requires, restores, or publishes the physical field result.
// PROVENANCE:   Scope/steps/05a_recast_player.md before/after golden acceptance

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const golden = JSON.parse(await readFile(new URL(
  "../../data/fixtures/report-player/route-truth-analysis.golden.json",
  import.meta.url,
)));

test("reviewed field receipt remains complete after its private input is removed", () => {
  assert.deepEqual(golden.after, {
    thresholds: { stickySeconds: 5, accuracyM: 10 },
    sampleCount: 40,
    measuredSeconds: 98.214,
    movingSeconds: 68.214,
    sticky: { pointCount: 25, seconds: 60.028, percent: 88 },
    accuracy: { pointCount: 2, seconds: 2.963, percent: 3.017 },
    medianAccuracyM: 3.73,
    p95AccuracyM: 9.26,
    medianRttMs: 971.5,
  });
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
  assert.equal(golden.input, "private field result removed after reviewed golden");
  assert.equal(golden.review.classificationDurationsChanged, false);
  assert.equal(golden.review.routeTruthChanged, true);
});
