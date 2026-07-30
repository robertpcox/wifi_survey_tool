// FEATURE:      Report lag-behind analysis
// SURFACE:      Node test for report-lag-behind.mjs
// WHY TOGETHER: Out-and-back fixture assertions prove signed along-track lag both directions.
// STATE:        One out-and-back fixture timeline and truth model
// RULES:        Held fixes trail positive in both directions; dwell stays out of statistics.
// PROVENANCE:   NDH freshness lane · how far behind the dot ran

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGroundTruthModel } from "./report-ground-truth.mjs";
import { buildLagBehind } from "./report-lag-behind.mjs";
import { buildReportTimeline } from "./report-samples.mjs";

const result = JSON.parse(await readFile(
  new URL(
    "../../data/fixtures/report-player/result.out-and-back.fixture.v3.json",
    import.meta.url,
  ),
));
const thresholds = { stickySeconds: 2, accuracyM: 5, noPositionSeconds: 8 };
const truth = buildGroundTruthModel(result);
const timeline = buildReportTimeline(result, truth, thresholds);
const lag = buildLagBehind({ timeline, truth, thresholds });
const byPoll = new Map(lag.series.map(item => [item.pollId, item]));

test("a held fix trails the walker by growing positive lag", () => {
  assert.equal(byPoll.get("poll-1").lagBehindM, 0);
  assert.equal(byPoll.get("poll-2").lagBehindM, 2.815);
  assert.equal(byPoll.get("poll-5").lagBehindM, 11.262);
  assert.equal(byPoll.get("poll-2").direction, "forward");
});

test("lag stays positive when the walking direction reverses", () => {
  const reverseHold = byPoll.get("poll-10");
  assert.equal(reverseHold.direction, "reverse");
  assert.equal(reverseHold.lagBehindM, 5.631);
  assert.equal(byPoll.get("poll-12").lagBehindM, 11.262);
});

test("moving statistics exclude dwell samples and count threshold breaches", () => {
  assert.equal(byPoll.get("poll-14").moving, false);
  assert.equal(lag.metrics.lagSampleCount, 13);
  assert.equal(lag.metrics.medianLagBehindM, 5.631);
  assert.equal(lag.metrics.maxLagBehindM, 11.262);
  assert.equal(lag.metrics.lagBeyondThresholdPercent, 53.846);
});

test("a fix far from any plausible route position stays unmeasured", () => {
  const offRoute = structuredClone(result);
  const poll = offRoute.polls.find(item => item.id === "poll-7");
  poll.normalized.lat += 0.001;
  const clippedTruth = buildGroundTruthModel(offRoute);
  const clipped = buildLagBehind({
    timeline: buildReportTimeline(offRoute, clippedTruth, thresholds),
    truth: clippedTruth,
    thresholds,
  });
  assert.equal(
    clipped.series.find(item => item.pollId === "poll-7").lagBehindM,
    null,
  );
});
