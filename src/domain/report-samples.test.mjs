// FEATURE:      Report Player analysis
// SURFACE:      Node test for report-samples.mjs
// WHY TOGETHER: Fixture variants prove fix-time and coordinate-signature identity.
// STATE:        Loaded fixture cloned for missing-fix-time behavior
// RULES:        Confidence is not part of a provider fix identity.
// PROVENANCE:   Step 5 sticky-position analysis test

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGroundTruthModel } from "./report-ground-truth.mjs";
import {
  buildReportTimeline,
  reportQuantile,
} from "./report-samples.mjs";

const result = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("fix timestamp persists through confidence changes and excludes equality", () => {
  const timeline = buildReportTimeline(
    result,
    buildGroundTruthModel(result),
    { stickySeconds: 4, accuracyM: 5 },
  );
  const third = timeline.find(sample => sample.pollId === "poll-3");
  assert.equal(third.fixAgeSeconds, 4);
  assert.equal(third.sticky, false);
  assert.equal(reportQuantile([10, 20, 30, 40], 0.5), 25);
});

test("position and floor are the stable signature when fix time is absent", () => {
  const withoutTimes = structuredClone(result);
  for (const poll of withoutTimes.polls) delete poll.normalized.fixTime;
  const timeline = buildReportTimeline(
    withoutTimes,
    buildGroundTruthModel(withoutTimes),
    { stickySeconds: 3, accuracyM: 5 },
  );
  assert.equal(
    timeline.find(sample => sample.pollId === "poll-3").fixAgeSeconds,
    2,
  );
  assert.equal(
    timeline.find(sample => sample.pollId === "poll-4").fixAgeSeconds,
    0,
  );
  withoutTimes.polls[3].normalized.z = 1;
  const changedFloor = buildReportTimeline(
    withoutTimes,
    buildGroundTruthModel(withoutTimes),
    { stickySeconds: 3, accuracyM: 5 },
  );
  assert.equal(
    changedFloor.find(sample => sample.pollId === "poll-4").fixAgeSeconds,
    0,
  );
});

test("preflight and polls outside the recorded run never enter analysis", () => {
  const windowed = structuredClone(result);
  const before = structuredClone(result.polls[1]);
  before.id = "before-run";
  before.receivedAt = "2026-07-28T00:59:59.000Z";
  const after = structuredClone(result.polls[1]);
  after.id = "after-run";
  after.receivedAt = "2026-07-28T01:00:21.000Z";
  windowed.polls.push(before, after);
  const timeline = buildReportTimeline(
    windowed,
    buildGroundTruthModel(windowed),
    { stickySeconds: 3, accuracyM: 5 },
  );
  assert.deepEqual(
    timeline.map(sample => sample.pollId),
    ["poll-2", "poll-3", "poll-4", "poll-5", "poll-6", "poll-7", "poll-8"],
  );
});
