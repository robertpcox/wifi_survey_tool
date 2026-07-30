// FEATURE:      Report effective-availability analysis
// SURFACE:      Node test for report-no-position.mjs
// WHY TOGETHER: Fixture assertions prove stale-served time, failures, and located episodes.
// STATE:        One out-and-back fixture timeline and truth model
// RULES:        HTTP 200 with an old fix counts as a dropout; fresh serving ends an episode.
// PROVENANCE:   NDH availability lane · provider always 200s with the last-ever fix

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGroundTruthModel } from "./report-ground-truth.mjs";
import { buildNoPositionOutages } from "./report-no-position.mjs";
import { buildReportTimeline } from "./report-samples.mjs";

const result = JSON.parse(await readFile(
  new URL(
    "../../data/fixtures/report-player/result.out-and-back.fixture.v3.json",
    import.meta.url,
  ),
));
const thresholds = { stickySeconds: 2, accuracyM: 5 };
const truth = buildGroundTruthModel(result);
const timeline = buildReportTimeline(result, truth, thresholds);

test("time serving a fix older than the threshold counts as no position", () => {
  const outages = buildNoPositionOutages({
    result,
    timeline,
    truth,
    thresholdSeconds: 8,
  });
  assert.equal(outages.thresholdSeconds, 8);
  assert.equal(outages.totalSeconds, 16);
  assert.equal(outages.percent, 26.667);
  assert.equal(outages.episodes.length, 5);
  const longest = outages.episodes[2];
  assert.equal(longest.startedAt, "2026-07-28T01:00:28.000Z");
  assert.equal(longest.durationSeconds, 8);
  assert.equal(longest.z, 0);
  assert.equal(longest.routeDistanceM, 36.6);
});

test("failed polls count even though their HTTP evidence is missing a fix", () => {
  const failing = structuredClone(result);
  for (const poll of failing.polls.filter(item => (
    ["poll-2", "poll-3"].includes(item.id)
  ))) {
    poll.success = false;
    poll.normalized = null;
    poll.error = "Bad gateway";
  }
  const failingTruth = buildGroundTruthModel(failing);
  const outages = buildNoPositionOutages({
    result: failing,
    timeline: buildReportTimeline(failing, failingTruth, thresholds),
    truth: failingTruth,
    thresholdSeconds: 30,
  });
  assert.equal(outages.totalSeconds, 4);
  assert.equal(outages.episodes.length, 1);
  assert.equal(outages.episodes[0].startedAt, "2026-07-28T01:00:08.000Z");
});

test("a generous threshold reports a clean run", () => {
  const outages = buildNoPositionOutages({
    result,
    timeline,
    truth,
    thresholdSeconds: 30,
  });
  assert.equal(outages.totalSeconds, 0);
  assert.deepEqual(outages.episodes, []);
  assert.equal(outages.percent, 0);
});
