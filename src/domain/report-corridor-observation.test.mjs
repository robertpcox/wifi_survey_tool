// FEATURE:      Corridor area evidence
// SURFACE:      node --test src/domain/report-corridor-observation.test.mjs
// WHY TOGETHER: Intermediate eligibility and raw displayed-fix timing define all-run samples.
// STATE:        Cloned compact result fixture
// RULES:        Every intermediate contributes one sample; stops and dwell ticks never enter.
// PROVENANCE:   All eligible survey corridor checkpoints

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildCorridorObservations }
  from "./report-corridor-observation.mjs";

const source = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("dynamic intermediate marks repeatedly sample the unsnapped Cisco dot", () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  const observations = buildCorridorObservations(result);
  assert.equal(observations.length, 1);
  assert.equal(observations[0].checkpointId, "checkpoint-b");
  assert.equal(observations[0].observationKind, "corridor-point");
  assert.equal(observations[0].entry, observations[0].exit);
  assert.equal(observations[0].entry.pollId, "poll-5");
  assert.deepEqual(observations[0].entry.point, {
    lng: source.polls[4].normalized.lng,
    lat: source.polls[4].normalized.lat,
    z: source.polls[4].normalized.z,
  });
  assert.equal(observations[0].direction, "forward");
});

test("reviewed run exclusions remove dynamic corridor evidence", () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  const exception = {
    id: "exclude-corridor-run",
    resultId: result.run.resultId,
    routeHash: result.run.routeHash,
    routeAnchor: {
      type: "checkpoint-interval",
      routeHash: result.run.routeHash,
      fromCheckpointId: "checkpoint-a",
      toCheckpointId: "checkpoint-b",
      legId: "leg-a-c",
    },
    code: "missing-check-in",
    reason: "The captured route is not defensible.",
    disposition: "exclude-run",
    reviewer: "test-reviewer",
    recordedAt: "2026-08-10T00:00:00.000Z",
  };
  assert.deepEqual(buildCorridorObservations(result, [exception]), []);
});

test("planned intermediates contribute one corridor sample regardless of dwell", () => {
  const result = structuredClone(source);
  result.route.checkpoints[1].dwellSeconds = 20;
  const observations = buildCorridorObservations(result);
  assert.equal(observations.length, 1);
  assert.equal(observations[0].checkpointId, "checkpoint-b");
  assert.equal(observations[0].observationKind, "corridor-point");
  assert.equal(observations[0].startMs, observations[0].endMs);
});
