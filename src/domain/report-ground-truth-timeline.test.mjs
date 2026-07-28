// FEATURE:      Report Player ground truth
// SURFACE:      Node tests for report-ground-truth-timeline.mjs
// WHY TOGETHER: Planned dwell boundaries and route-distance movement share one lookup.
// STATE:        Deterministic projected points
// RULES:        Dwell consumes time without consuming route distance.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic truth acceptance

import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTruthSegments,
  publicTruthSegment,
  truthAtTime,
} from "./report-ground-truth-timeline.mjs";

const points = [
  point("a", 1_000, 0),
  point("b", 5_000, 10),
];
const route = {
  pointAt(distanceM) {
    return { ...point("route", 0, distanceM), lng: distanceM };
  },
  interval(startDistanceM, endDistanceM) {
    return { startDistanceM, endDistanceM, segments: [] };
  },
};

test("timeline holds dwell then advances cumulative route distance", () => {
  const segments = buildTruthSegments(points, 2_000, 7_000);
  assert.deepEqual(segments.map(publicTruthSegment), [
    {
      startMs: 1_000,
      endMs: 3_000,
      moving: false,
      fromCheckpointId: "a",
      toCheckpointId: "a",
      startDistanceM: 0,
      endDistanceM: 10,
    },
    {
      startMs: 3_000,
      endMs: 5_000,
      moving: true,
      fromCheckpointId: "a",
      toCheckpointId: "b",
      startDistanceM: 0,
      endDistanceM: 10,
    },
    {
      startMs: 5_000,
      endMs: 7_000,
      moving: false,
      fromCheckpointId: "b",
      toCheckpointId: "b",
      startDistanceM: 10,
      endDistanceM: 10,
    },
  ]);
  assert.equal(truthAtTime(points, segments, route, 2_000, 7_000).routeDistanceM, 0);
  assert.equal(truthAtTime(points, segments, route, 4_000, 7_000).routeDistanceM, 5);
});

function point(checkpointId, atMs, routeDistanceM) {
  return {
    checkpointId,
    atMs,
    routeDistanceM,
    lat: 0,
    lng: routeDistanceM,
    z: 0,
    activeLegId: "leg",
    activeLegIndex: 0,
  };
}
