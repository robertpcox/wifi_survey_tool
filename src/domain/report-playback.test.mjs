// FEATURE:      V3 result playback
// SURFACE:      Deterministic tests for report-playback.mjs
// WHY TOGETHER: Bounds, capture projection, and poll evidence form one playback contract.
// STATE:        One immutable report result fixture
// RULES:        Prove clipping, preflight exclusion, evidence retention, and walker projection.
// PROVENANCE:   Scope/test_plan.md Step 5 playback gates

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  playbackBounds,
  playbackEventTimes,
  playbackFrame,
} from "./report-playback.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
  "utf8",
));
const startMs = Date.parse(fixture.run.startedAt);
const endMs = Date.parse(fixture.run.stoppedAt);

test("playback bounds and requested time stay inside the recorded run", () => {
  assert.deepEqual(playbackBounds(fixture), {
    startMs,
    endMs,
    durationMs: 20_000,
  });
  const before = playbackFrame(fixture, startMs - 5_000);
  assert.equal(before.atMs, startMs);
  assert.equal(before.clock, fixture.run.startedAt);
  assert.equal(before.progress, 0);
  const after = playbackFrame(fixture, endMs + 5_000);
  assert.equal(after.atMs, endMs);
  assert.equal(after.progress, 1);
  assert.ok(after.currentPositionErrorM > 30);
  assert.ok(after.pollEvidence.latestRawFix.distanceM < 6);
  assert.throws(
    () => playbackFrame(fixture, Number.NaN),
    /atMs must be finite/,
  );
});

test("frame retains raw poll timing while excluding preflight from the trail", () => {
  const frame = playbackFrame(fixture, startMs + 6_000);
  assert.equal(frame.preflight, fixture.run.preflight);
  assert.deepEqual(frame.polls.map(poll => poll.id), ["poll-2", "poll-3"]);
  assert.deepEqual(frame.pollTrail.map(poll => poll.id), ["poll-2"]);
  assert.deepEqual(frame.changedFixHistory, frame.pollTrail);
  assert.equal(frame.latestPoll.id, "poll-3");
  assert.equal(frame.latestPoll.raw.provider, "fixture");
  assert.equal(frame.latestFix, frame.latestPoll.normalized);
  assert.equal(frame.latestFixAgeSeconds, 4);
  assert.deepEqual(
    frame.pollEvidence.outcomes.map(item => item.pollId),
    ["poll-2"],
  );
  assert.deepEqual(
    frame.chartSeries.map(point => point.pollId),
    ["poll-2", "poll-3"],
  );
  assert.deepEqual(frame.latestTiming, {
    sentAt: frame.latestPoll.sentAt,
    receivedAt: frame.latestPoll.receivedAt,
    roundTripMs: 100,
    httpStatus: 200,
    success: true,
    error: null,
  });
  assert.ok(frame.polls.every(poll => poll.id !== frame.preflight.sampleId));
});

test("frame projects check-ins, events, capture order, and walker through time", () => {
  const frame = playbackFrame(fixture, startMs + 12_000);
  assert.deepEqual(
    frame.checkIns.map(checkIn => checkIn.checkpointId),
    ["checkpoint-a", "checkpoint-b"],
  );
  assert.deepEqual(
    frame.events.map(event => event.type),
    ["run-started", "capture-note"],
  );
  assert.deepEqual(
    frame.captureEvents.map(capture => [
      capture.kind,
      capture.value.type ?? capture.value.checkpointId,
    ]),
    [
      ["event", "run-started"],
      ["check-in", "checkpoint-a"],
      ["check-in", "checkpoint-b"],
      ["event", "capture-note"],
    ],
  );
  assert.ok(frame.walker);
  assert.equal(frame.walker.z, 0);
  assert.equal(frame.elapsedMs, 12_000);
  assert.equal(frame.progress, 0.6);
});

test("event controls and transition/chart times are deterministic", () => {
  const frame = playbackFrame(fixture, startMs + 12_000);
  assert.deepEqual(playbackEventTimes(fixture), frame.eventTimes);
  assert.equal(frame.previousEventMs, startMs + 11_000);
  assert.equal(frame.nextEventMs, startMs + 18_000);
  assert.ok(frame.transitionTimes.includes(startMs + 3_900));
  const chartPoint = frame.chartSeries.at(-1);
  assert.equal(chartPoint.atMs, startMs + 12_000);
  assert.equal(chartPoint.elapsedMs, 12_000);
  assert.equal(chartPoint.fixAgeSeconds, 4);
  assert.equal(chartPoint.pollId, "poll-6");
  assert.ok(Number.isFinite(chartPoint.distanceM));
});

test("failed polls remain evidence but do not replace the latest fix or trail", () => {
  const result = structuredClone(fixture);
  result.polls.push({
    id: "poll-failed",
    sourceId: "mazemap-cloud",
    sentAt: "2026-07-28T01:00:16.900Z",
    receivedAt: "2026-07-28T01:00:17.000Z",
    roundTripMs: 100,
    httpStatus: 500,
    success: false,
    normalized: null,
    raw: { reason: "fixture failure" },
    error: "Positioning proxy returned HTTP 500",
  });
  const frame = playbackFrame(result, startMs + 17_000);
  assert.equal(frame.latestPoll.id, "poll-failed");
  assert.equal(frame.latestFix, result.polls.at(-2).normalized);
  assert.equal(frame.pollTrail.at(-1).id, "poll-8");
  assert.equal(frame.latestTiming.httpStatus, 500);
  assert.equal(frame.pollEvidence.failures.at(-1).pollId, "poll-failed");
  assert.ok(frame.pollEvidence.failures.at(-1).markerTruth);
});
