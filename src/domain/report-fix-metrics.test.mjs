// FEATURE:      Report fix-matched analysis
// SURFACE:      Node test for report-fix-metrics.mjs
// WHY TOGETHER: Lane assertions prove accuracy, freshness, and availability stay separated.
// STATE:        Loaded fixture cloned for failure injection
// RULES:        Failed polls count against availability only, never against accuracy.
// PROVENANCE:   NDH 2026-07-30 fix-matched accuracy findings

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildFixLanes } from "./report-fix-metrics.mjs";
import { buildUniqueFixSamples } from "./report-fix-samples.mjs";
import { buildGroundTruthModel } from "./report-ground-truth.mjs";
import { buildReportTimeline } from "./report-samples.mjs";

const result = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

function lanes(source, overrides = {}) {
  const thresholds = { stickySeconds: 2, accuracyM: 5, noPositionSeconds: 30 };
  const truth = buildGroundTruthModel(source);
  return buildFixLanes({
    result: source,
    samples: buildUniqueFixSamples(source, truth),
    thresholds,
    movingSeconds: 12,
    stickySeconds: 8,
    timeline: buildReportTimeline(source, truth, thresholds),
    truth,
    ...overrides,
  });
}

test("accuracy lane scores unique fixes against provider confidence", () => {
  const { accuracy } = lanes(result);
  assert.equal(accuracy.uniqueFixCount, 3);
  assert.equal(accuracy.scoredFixCount, 3);
  assert.equal(accuracy.confidenceJudgedCount, 3);
  assert.equal(accuracy.withinConfidenceCount, 1);
  assert.equal(accuracy.withinConfidencePercent, 33.333);
  assert.equal(accuracy.beyondConfidencePercent, 66.667);
  assert.equal(accuracy.beyondThresholdCount, 2);
  assert.equal(accuracy.maxAccuracyM > accuracy.medianAccuracyM, true);
});

test("freshness lane owns latency, fix interval, hold, and sticky time", () => {
  const { freshness } = lanes(result);
  assert.equal(freshness.medianDeliveryLatencySeconds, 0);
  assert.equal(freshness.maxDeliveryLatencySeconds, 2);
  assert.equal(freshness.medianFixIntervalSeconds, 7);
  assert.equal(freshness.maxFixIntervalSeconds, 8);
  assert.equal(freshness.longestHoldSeconds, 6);
  assert.equal(freshness.noFreshFixSeconds, 8);
  assert.equal(freshness.noFreshFixPercent, 66.667);
  assert.equal(freshness.stickyThresholdSeconds, 2);
  assert.ok(Number.isFinite(freshness.medianLagBehindM));
  assert.ok(freshness.lagSampleCount > 0);
});

test("availability lane keeps failed polls that accuracy never sees", () => {
  const failing = structuredClone(result);
  failing.polls.push({
    id: "poll-9",
    sourceId: "mazemap-cloud",
    sentAt: "2026-07-28T01:00:17.900Z",
    receivedAt: "2026-07-28T01:00:18.000Z",
    roundTripMs: 4000,
    httpStatus: 502,
    success: false,
    normalized: null,
    raw: null,
    error: "Bad gateway",
  });
  const { availability, accuracy } = lanes(failing);
  assert.equal(availability.pollCount, 8);
  assert.equal(availability.successCount, 7);
  assert.equal(availability.failureCount, 1);
  assert.equal(availability.successPercent, 87.5);
  assert.equal(availability.medianRttMs, 100);
  assert.equal(availability.noPositionThresholdSeconds, 30);
  assert.equal(accuracy.uniqueFixCount, 3);
});
