// FEATURE:      Consolidated corridor resolution summary
// SURFACE:      node --test src/domain/report-corridor-summary.test.mjs
// WHY TOGETHER: Corridor rates, directions, POI grouping, and drift points form one contract.
// STATE:        Synthetic scored corridor samples
// RULES:        Many samples represent one corridor without merging distinct POI identities.
// PROVENANCE:   Long-corridor MazeMap area-resolution evidence

import assert from "node:assert/strict";
import test from "node:test";

import { buildCorridorResolutionSummary }
  from "./report-corridor-summary.mjs";

function sample(resultId, resolved, direction, poiId = "corridor-a") {
  return {
    resultId, checkpointId: `${resultId}-${direction}`,
    target: { lng: 170.5, lat: -45.8, z: 1 },
    expectedRoom: { id: poiId, identifier: "C01", name: "Main corridor", z: 1 },
    device: { name: resultId }, direction,
    scored: true, resolved,
    primary: {
      status: resolved ? "resolved" : "wrong-room",
      outsideDistanceM: resolved ? 0 : 3.6,
      point: { lng: resolved ? 170.5 : 170.6, lat: -45.8, z: 1 },
    },
  };
}

test("corridor summary scores many points and preserves both directions", () => {
  const summary = buildCorridorResolutionSummary([
    sample("run-a", true, "forward"),
    sample("run-b", true, "reverse"),
    sample("run-b", false, "reverse"),
  ]);
  assert.equal(summary.sampleCount, 3);
  assert.equal(summary.resolutionPercent, 66.7);
  assert.equal(summary.corridors.length, 1);
  assert.equal(summary.corridors[0].runCount, 2);
  assert.equal(summary.corridors[0].bothDirections, true);
  assert.equal(summary.corridors[0].bothFailureDirections, false);
  assert.equal(summary.corridors[0].reverseFailures, 1);
  assert.equal(summary.corridors[0].identifier, "C01");
  assert.equal(summary.corridors[0].maxOutsideDistanceM, 3.6);
  assert.equal(summary.ciscoIssuePoints[0].lng, 170.6);
});

test("adjacent MazeMap corridor identities never merge by label or grid", () => {
  const summary = buildCorridorResolutionSummary([
    sample("run-a", true, "forward", "corridor-a"),
    sample("run-a", true, "forward", "corridor-b"),
  ]);
  assert.equal(summary.corridors.length, 2);
});
