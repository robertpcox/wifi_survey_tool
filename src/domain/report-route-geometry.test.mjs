// FEATURE:      Report Player route truth
// SURFACE:      Node tests for report-route-geometry.mjs
// WHY TOGETHER: Bounded projection and point lookup share one synthetic route.
// STATE:        None
// RULES:        Floor and distance bounds are strict, with deterministic lower-distance ties.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic truth acceptance

import assert from "node:assert/strict";
import test from "node:test";

import {
  projectToReportRoute,
  reportRoutePointAt,
} from "./report-route-geometry.mjs";

const segments = [
  segment(0, 10, 0, 0, 0.001, 0, 0),
  segment(10, 20, 0.001, 0, 0.002, 0, 1),
];

test("projection obeys cumulative bounds and the requested floor", () => {
  const candidate = projectToReportRoute(
    segments,
    20,
    { lng: 0.0015, lat: 0.0001, z: 1 },
    { minDistanceM: 10, maxDistanceM: 20, z: 1 },
  );
  assert.equal(candidate.z, 1);
  assert.equal(candidate.routeDistanceM, 20);
  assert.equal(
    projectToReportRoute(
      segments,
      20,
      { lng: 0.0015, lat: 0, z: 2 },
      { minDistanceM: 0, maxDistanceM: 20, z: 2 },
    ),
    null,
  );
});

test("lookup keeps floors discrete across a transition", () => {
  assert.equal(reportRoutePointAt(segments, 20, 19.999).z, 0);
  assert.equal(reportRoutePointAt(segments, 20, 20).z, 1);
});

function segment(startDistanceM, endDistanceM, fromLng, fromLat, toLng, toLat, toZ) {
  return {
    legId: "leg",
    legIndex: 0,
    startDistanceM,
    endDistanceM,
    lengthM: endDistanceM - startDistanceM,
    from: { lng: fromLng, lat: fromLat, z: 0 },
    to: { lng: toLng, lat: toLat, z: toZ },
  };
}
