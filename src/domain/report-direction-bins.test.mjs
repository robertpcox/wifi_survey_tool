// FEATURE:      Report direction overlay
// SURFACE:      Node test for report-direction-bins.mjs
// WHY TOGETHER: Publication and summary assertions interpret one accumulated bin shape.
// STATE:        None
// RULES:        Flags need both directions; one-sided evidence stays a latency reading.
// PROVENANCE:   NDH out-and-back corridor overlay contract

import assert from "node:assert/strict";
import test from "node:test";

import {
  directionOverlaySummary,
  publicDirectionBin,
} from "./report-direction-bins.mjs";

const options = { binSizeM: 5, errorThresholdM: 5, lockSecondsMin: 3 };

function bin(index, forward, reverse, undirected = 0) {
  return {
    index,
    z: 0,
    forward,
    reverse,
    undirectedLockSeconds: undirected,
  };
}

test("bin publication averages directions and totals lock seconds", () => {
  const published = publicDirectionBin(bin(
    1,
    { errors: [8, 6], lockSeconds: 4 },
    { errors: [10], lockSeconds: 3.5 },
    1,
  ), options);
  assert.equal(published.binStartM, 5);
  assert.equal(published.binDistanceM, 7.5);
  assert.equal(published.byDirection.forward.medianErrorM, 7);
  assert.equal(published.byDirection.reverse.n, 1);
  assert.equal(published.meanErrorM, 8.5);
  assert.equal(published.deltaM, -3);
  assert.equal(published.lockSeconds, 8.5);
  assert.equal(published.rfIssue, true);
  assert.equal(published.lockBothWays, true);
});

test("one-sided evidence never raises a both-direction flag", () => {
  const published = publicDirectionBin(bin(
    0,
    { errors: [12], lockSeconds: 6 },
    { errors: [], lockSeconds: 0 },
  ), options);
  assert.equal(published.rfIssue, false);
  assert.equal(published.lockBothWays, false);
  assert.equal(published.meanErrorM, 12);
  assert.equal(published.deltaM, null);
  const summary = directionOverlaySummary([published]);
  assert.deepEqual(summary, {
    binCount: 1,
    lockBothWaysBins: [],
    rfIssueBins: [],
    singleDirectionLockBins: [2.5],
  });
});
