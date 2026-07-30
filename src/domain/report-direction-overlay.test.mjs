// FEATURE:      Report direction overlay
// SURFACE:      Node test for report-direction-overlay.mjs
// WHY TOGETHER: Out-and-back fixture assertions separate dead zones from latency artefacts.
// STATE:        One analyzed out-and-back fixture
// RULES:        Flags require evidence in both walking directions at the same corridor spot.
// PROVENANCE:   NDH out-and-back corridor overlay contract

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "./report-analysis.mjs";
import { buildDirectionOverlay } from "./report-direction-overlay.mjs";

const result = JSON.parse(await readFile(
  new URL(
    "../../data/fixtures/report-player/result.out-and-back.fixture.v3.json",
    import.meta.url,
  ),
));
const analysis = analyzeReportResult(result, { stickySeconds: 2, accuracyM: 5 });

test("both-direction error at one corridor spot flags an RF suspect", () => {
  const overlay = buildDirectionOverlay(result, analysis);
  assert.equal(overlay.binSizeM, 5);
  assert.equal(overlay.errorThresholdM, 5);
  assert.deepEqual(overlay.summary.rfIssueBins, [7.5]);
  const flagged = overlay.bins.find(bin => bin.rfIssue);
  assert.equal(flagged.byDirection.forward.n, 1);
  assert.equal(flagged.byDirection.reverse.n, 1);
  assert.equal(flagged.byDirection.forward.medianErrorM, 11.119);
  assert.equal(flagged.meanErrorM, 11.119);
  assert.equal(flagged.deltaM, 0);
  assert.equal(flagged.lockBothWays, true);
});

test("lock heat is hottest where fixes hold in both directions", () => {
  const overlay = buildDirectionOverlay(result, analysis);
  assert.deepEqual(overlay.summary.lockBothWaysBins, [7.5, 12.5, 27.5]);
  const dead = overlay.bins.find(bin => bin.binDistanceM === 12.5);
  assert.ok(dead.byDirection.forward.lockSeconds >= 3);
  assert.ok(dead.byDirection.reverse.lockSeconds >= 3);
  assert.equal(dead.z, 0);
  const raised = buildDirectionOverlay(result, analysis, { lockSecondsMin: 30 });
  assert.deepEqual(raised.summary.lockBothWaysBins, []);
});

test("one-direction lock reads as latency, not a dead zone", () => {
  const overlay = buildDirectionOverlay(result, analysis);
  assert.deepEqual(overlay.summary.singleDirectionLockBins, [2.5]);
  const start = overlay.bins.find(bin => bin.binDistanceM === 2.5);
  assert.equal(start.byDirection.forward.lockSeconds, 0);
  assert.ok(start.byDirection.reverse.lockSeconds > 3);
  assert.equal(start.lockBothWays, false);
  assert.equal(start.rfIssue, false);
  assert.equal(start.meanErrorM, 0);
});

test("return-pass fixes fold onto first-pass corridor distances", () => {
  const overlay = buildDirectionOverlay(result, analysis);
  assert.ok(overlay.axisLengthM > 61 && overlay.axisLengthM < 63);
  assert.equal(overlay.bins.at(-1).binStartM, 30);
  assert.equal(
    overlay.bins.filter(bin => bin.byDirection.reverse.n > 0).length >= 3,
    true,
  );
});
