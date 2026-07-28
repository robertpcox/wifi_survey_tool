// FEATURE:      Report Player poll evidence
// SURFACE:      Node tests for report-poll-evidence.mjs
// WHY TOGETHER: In-flight, persistent, live-fix, and scrub behavior share one clock cut.
// STATE:        Cloned deterministic report fixture
// RULES:        Future outcomes vanish and failures never replace a usable raw fix.
// PROVENANCE:   Scope/contracts/report_analysis.md playback evidence acceptance

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGroundTruthModel } from "./report-ground-truth.mjs";
import { playbackPollEvidenceAt } from "./report-poll-evidence.mjs";
import { buildPlaybackPollTimeline } from "./report-poll-timeline.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));
const bounds = {
  startMs: Date.parse(fixture.run.startedAt),
  endMs: Date.parse(fixture.run.stoppedAt),
};

test("changed successes persist as pairs while unchanged successes add none", () => {
  const { evidence } = evidenceAt(fixture, 16_000);
  assert.deepEqual(
    evidence.outcomes.map(item => item.pollId),
    ["poll-2", "poll-4", "poll-8"],
  );
  assert.equal(evidence.outcomes[0].rawFix, fixture.polls[1].normalized);
  assert.ok(evidence.outcomes.every(item => item.routeEstimate));
  assert.equal(evidence.latestRawFix.pollId, "poll-8");
  assert.equal(evidence.latestRawFix.poll, fixture.polls[7]);
  assert.ok(evidence.latestRawFix.receivedTruth);
  assert.ok(Number.isFinite(evidence.latestRawFix.distanceM));
  assert.equal(evidence.latestRawFix.floorMatch, false);
  assert.equal(evidence.latestRawFix.timing.roundTripMs, 100);
  assert.equal(evidence.chartSeries.length, 7);
});

test("in-flight request exposes its sent ring and growing route span", () => {
  const result = structuredClone(fixture);
  result.polls.push(failedPoll(
    "poll-slow",
    "2026-07-28T01:00:16.500Z",
    "2026-07-28T01:00:19.000Z",
  ));
  const { evidence } = evidenceAt(result, 17_000);
  const active = evidence.inFlight.find(item => item.pollId === "poll-slow");
  assert.ok(active.sentTruth);
  assert.ok(active.currentTruth);
  assert.ok(active.routeSpan);
  assert.equal(evidence.failures.some(item => item.pollId === "poll-slow"), false);
});

test("failure persists at sent truth, scrubs away, and never moves raw blue fix", () => {
  const result = structuredClone(fixture);
  result.polls.push(failedPoll(
    "poll-failed",
    "2026-07-28T01:00:16.900Z",
    "2026-07-28T01:00:17.000Z",
  ));
  const after = evidenceAt(result, 17_000).evidence;
  const failure = after.failures.find(item => item.pollId === "poll-failed");
  assert.ok(failure.markerTruth);
  assert.ok(failure.failureTruth);
  assert.equal(after.latestRawFix.pollId, "poll-8");
  const before = evidenceAt(result, 16_500).evidence;
  assert.equal(before.failures.some(item => item.pollId === "poll-failed"), false);
});

test("truthless capture evidence remains unlocated", () => {
  const result = structuredClone(fixture);
  result.polls.push(failedPoll(
    "poll-before-truth",
    "2026-07-28T01:00:00.500Z",
    "2026-07-28T01:00:01.000Z",
  ));
  const { evidence } = evidenceAt(result, 1_000);
  assert.equal(evidence.failures.length, 0);
  assert.equal(evidence.unlocated[0].pollId, "poll-before-truth");
  assert.equal(
    evidence.unlocated[0].unlocatedReason,
    "sent-route-estimate-unavailable",
  );
});

function evidenceAt(result, elapsedMs) {
  const truth = buildGroundTruthModel(result);
  const cycles = buildPlaybackPollTimeline(result, bounds, truth);
  const evidence = playbackPollEvidenceAt(
    cycles,
    bounds.startMs + elapsedMs,
    truth,
    bounds,
  );
  return { evidence, cycles };
}

function failedPoll(id, sentAt, receivedAt) {
  return {
    id,
    sentAt,
    receivedAt,
    roundTripMs: Date.parse(receivedAt) - Date.parse(sentAt),
    httpStatus: 500,
    success: false,
    normalized: null,
    raw: { reason: "fixture failure" },
    error: "fixture failure",
  };
}
