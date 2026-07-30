// FEATURE:      Report fix-matched analysis
// SURFACE:      Node test for report-fix-samples.mjs
// WHY TOGETHER: Fixture assertions prove dedupe, fix-time scoring, and confidence carry.
// STATE:        Loaded fixture cloned for window-clipping behavior
// RULES:        Confidence changes never split a fix; unscored fixes stay counted.
// PROVENANCE:   NDH 2026-07-30 fix-matched accuracy findings

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildUniqueFixSamples, publicFixSample } from "./report-fix-samples.mjs";
import { buildGroundTruthModel } from "./report-ground-truth.mjs";

const result = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("polls collapse into unique fixes keyed by fix time", () => {
  const samples = buildUniqueFixSamples(result, buildGroundTruthModel(result));
  assert.equal(samples.length, 3);
  assert.deepEqual(samples.map(sample => sample.pollId), ["poll-2", "poll-4", "poll-8"]);
  assert.deepEqual(samples.map(sample => sample.pollCount), [2, 4, 1]);
  assert.deepEqual(samples.map(sample => sample.holdSeconds), [2, 6, 0]);
  assert.deepEqual(samples.map(sample => sample.confidenceM), [0.9, 0.8, 0.9]);
  assert.deepEqual(
    samples.map(sample => sample.deliveryLatencySeconds),
    [2, 0, 0],
  );
});

test("accuracy is scored at fix time against ground truth", () => {
  const samples = buildUniqueFixSamples(result, buildGroundTruthModel(result));
  const [first, second, third] = samples;
  assert.equal(first.accuracyM, 0);
  assert.equal(first.withinConfidence, true);
  assert.ok(second.accuracyM > 10, `held fix scores at fix time (${second.accuracyM})`);
  assert.equal(second.withinConfidence, false);
  assert.ok(third.accuracyM > 0 && third.accuracyM < 10);
  assert.equal(third.groundTruth.at, "2026-07-28T01:00:16.000Z");
});

test("fixes outside the truth window stay counted but unscored", () => {
  const clipped = structuredClone(result);
  clipped.polls[1].normalized.fixTime = "2026-07-28T00:59:00.000Z";
  clipped.polls[2].normalized.fixTime = "2026-07-28T00:59:00.000Z";
  const samples = buildUniqueFixSamples(clipped, buildGroundTruthModel(clipped));
  assert.equal(samples.length, 3);
  assert.equal(samples[0].groundTruth, null);
  assert.equal(samples[0].accuracyM, null);
  assert.equal(samples[0].withinConfidence, null);
  assert.equal(samples[0].deliveryLatencySeconds, 64);
});

test("public samples expose ISO times and hide grouping internals", () => {
  const samples = buildUniqueFixSamples(result, buildGroundTruthModel(result));
  const sample = publicFixSample(samples[0]);
  assert.equal(sample.fixTime, "2026-07-28T01:00:02.000Z");
  assert.equal(sample.firstReceivedAt, "2026-07-28T01:00:04.000Z");
  assert.equal(sample.lastReceivedAt, "2026-07-28T01:00:06.000Z");
  assert.equal("key" in sample, false);
  assert.equal("fixMs" in sample, false);
});
