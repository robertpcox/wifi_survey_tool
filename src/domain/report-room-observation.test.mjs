// FEATURE:      Stationary room evidence
// SURFACE:      node --test src/domain/report-room-observation.test.mjs
// WHY TOGETHER: Stop eligibility, dwell compatibility, and raw Player fixes share one contract.
// STATE:        Cloned compact result fixture
// RULES:        Every eligible stop uses authored dwell; walking and intermediates never enter.
// PROVENANCE:   All eligible survey stop/dwell evidence

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildRoomObservations } from "./report-room-observation.mjs";

const source = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("dynamic room observations use entry/exit displayed fixes at stop dwells", () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.checkpoints[0].dwellSeconds = 4;
  result.route.checkpoints[2].dwellSeconds = 0;
  const observations = buildRoomObservations(result);
  assert.equal(observations.length, 2);
  assert.deepEqual(observations.map(item => item.checkpointId), [
    "checkpoint-a", "checkpoint-c",
  ]);
  assert.equal(observations[0].observationKind, "dwell");
  assert.equal(observations[0].floorName, "Ground");
  assert.equal(observations[0].entry.pollId, null);
  assert.equal(observations[0].entry.point, null);
  assert.equal(observations[0].moments.length, 3);
  assert.equal(observations[0].moments[1].pollId, "poll-2");
  assert.equal(observations[0].exit.pollId, "poll-3");
  assert.equal(observations[0].exit.ageSeconds, 4);
  assert.equal(observations[0].windowSeconds, 4);
  assert.equal(observations[0].windowComplete, false);
  assert.equal(observations[0].windowEndMs, observations[0].endMs);
  assert.equal(observations[1].observationKind, "check-in");
  assert.equal(observations[1].windowSeconds, 0);
  assert.equal(observations[1].entry, observations[1].exit);
  assert.equal(observations[1].exit.pollId, "poll-8");
});

test("planned survey stops use the legacy authored dwell fallback", () => {
  const observations = buildRoomObservations(source);
  assert.equal(observations.length, 2);
  assert.deepEqual(observations.map(item => item.checkpointId), [
    "checkpoint-a", "checkpoint-c",
  ]);
  assert.ok(observations.every(item => item.observationKind === "dwell"));
  assert.ok(observations.every(item => item.dwellSeconds === 2));
});

test("long dwells expose only the first 20 seconds as working moments", () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.checkpoints[0].dwellSeconds = 30;
  result.checkIns[1].at = "2026-07-28T01:00:40.000Z";
  result.checkIns[2].at = "2026-07-28T01:00:48.000Z";
  result.run.stoppedAt = "2026-07-28T01:01:00.000Z";
  const observation = buildRoomObservations(result)[0];
  assert.equal(observation.dwellSeconds, 30);
  assert.equal(observation.windowSeconds, 20);
  assert.equal(observation.windowComplete, true);
  assert.equal(observation.exit.atMs, observation.windowEndMs);
  assert.ok(observation.windowEndMs < observation.endMs);
});

test("an explicit zero-dwell stop stays a check-in and consumes no walking time", () => {
  const result = structuredClone(source);
  result.route.checkpoints[0].dwellSeconds = 0;
  const observation = buildRoomObservations(result)[0];
  assert.equal(observation.observationKind, "check-in");
  assert.equal(observation.dwellSeconds, 0);
  assert.equal(observation.startMs, observation.endMs);
  assert.equal(observation.moments.length, 1);
});
