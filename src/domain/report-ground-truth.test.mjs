// FEATURE:      Report Player ground truth
// SURFACE:      Node test for report-ground-truth.mjs
// WHY TOGETHER: Fixture assertions prove dwell boundaries and interpolation together.
// STATE:        Loaded immutable report result fixture
// RULES:        Tests use deterministic fixture timestamps and no wall clock.
// PROVENANCE:   Step 5 domain test plan

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildReportGroundTruth } from "./report-ground-truth.mjs";

const result = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("ground truth holds planned dwell then interpolates to each check-in", () => {
  const truth = buildReportGroundTruth(result);
  assert.equal(truth.dwellSeconds, 2);
  assert.equal(truth.points.length, 3);
  assert.equal(truth.startMs, Date.parse("2026-07-28T01:00:02.000Z"));
  assert.equal(truth.endMs, Date.parse("2026-07-28T01:00:20.000Z"));

  assert.deepEqual(
    statusAt(truth, "2026-07-28T01:00:03.000Z"),
    { lng: 170.5, z: 0, moving: false, plannedDwell: true },
  );
  assert.deepEqual(
    statusAt(truth, "2026-07-28T01:00:04.000Z"),
    { lng: 170.5, z: 0, moving: true, plannedDwell: false },
  );
  assert.deepEqual(
    statusAt(truth, "2026-07-28T01:00:07.000Z"),
    { lng: 170.5001, z: 0, moving: true, plannedDwell: false },
  );
  assert.deepEqual(
    statusAt(truth, "2026-07-28T01:00:10.000Z"),
    { lng: 170.5002, z: 0, moving: false, plannedDwell: true },
  );
});

test("floor changes at the exact destination and lookup stays in run bounds", () => {
  const truth = buildReportGroundTruth(result);
  assert.equal(truth.at("2026-07-28T01:00:17.999Z").z, 0);
  assert.equal(truth.at("2026-07-28T01:00:18.000Z").z, 1);
  assert.equal(truth.at("2026-07-28T01:00:20.000Z").moving, false);
  assert.equal(truth.at("2026-07-28T01:00:01.999Z"), null);
  assert.equal(truth.at("2026-07-28T01:00:20.001Z"), null);
});

function statusAt(truth, at) {
  const point = truth.at(at);
  return {
    lng: point.lng,
    z: point.z,
    moving: point.moving,
    plannedDwell: point.plannedDwell,
  };
}
