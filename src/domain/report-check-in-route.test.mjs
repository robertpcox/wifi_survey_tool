// FEATURE:      Report Player route truth
// SURFACE:      Node tests for report-check-in-route.mjs
// WHY TOGETHER: Authored checkpoint bounds and monotonic projection are one invariant.
// STATE:        Cloned deterministic turning fixture
// RULES:        A displaced capture cannot project behind its checkpoint interval.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic truth acceptance

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { projectReportCheckIns } from "./report-check-in-route.mjs";
import { buildReportRoute } from "./report-route.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/route-turns.fixture.v3.json", import.meta.url),
));

test("captured check-ins project monotonically inside authored intervals", () => {
  const displaced = structuredClone(fixture);
  displaced.checkIns[1].groundTruth = { lng: 0, lat: 0, z: 0 };
  const points = projectReportCheckIns(
    displaced,
    buildReportRoute(displaced.route),
  );
  assert.ok(points[1].routeDistanceM >= points[0].routeDistanceM);
  assert.ok(
    points[1].routeDistanceM >= points[1].checkpointInterval.startDistanceM,
  );
  assert.equal(points[1].authoredLng, 0);
  assert.deepEqual(
    points.map(point => point.checkpointId),
    ["checkpoint-a", "checkpoint-b", "checkpoint-c"],
  );
});

test("an unknown check-in checkpoint is rejected", () => {
  const invalid = structuredClone(fixture);
  invalid.checkIns[1].checkpointId = "missing";
  assert.throws(
    () => projectReportCheckIns(invalid, buildReportRoute(invalid.route)),
    /must name a route checkpoint/,
  );
});
