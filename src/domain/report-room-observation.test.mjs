// FEATURE:      Dynamic stationary room evidence
// SURFACE:      node --test src/domain/report-room-observation.test.mjs
// WHY TOGETHER: Dynamic eligibility and raw Player fix snapshots share one evidence contract.
// STATE:        Cloned compact result fixture
// RULES:        Stop dwells score; intermediate and non-dynamic checkpoints never do.
// PROVENANCE:   Dynamic dwell room-resolution evidence

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildDynamicRoomObservations } from "./report-room-observation.mjs";

const source = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("dynamic room observations use entry/exit displayed fixes at stop dwells", () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.checkpoints[0].dwellSeconds = 4;
  result.route.checkpoints[2].dwellSeconds = 0;
  const observations = buildDynamicRoomObservations(result);
  assert.equal(observations.length, 2);
  assert.deepEqual(observations.map(item => item.checkpointId), [
    "checkpoint-a", "checkpoint-c",
  ]);
  assert.equal(observations[0].observationKind, "dwell");
  assert.equal(observations[0].entry.pollId, null);
  assert.equal(observations[0].entry.point, null);
  assert.equal(observations[0].moments.length, 3);
  assert.equal(observations[0].moments[1].pollId, "poll-2");
  assert.equal(observations[0].exit.pollId, "poll-3");
  assert.equal(observations[0].exit.ageSeconds, 4);
  assert.equal(observations[1].observationKind, "check-in");
  assert.equal(observations[1].entry, observations[1].exit);
  assert.equal(observations[1].exit.pollId, "poll-8");
});

test("planned survey checkpoints are never treated as dynamic room evidence", () => {
  assert.deepEqual(buildDynamicRoomObservations(source), []);
});
