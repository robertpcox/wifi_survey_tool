// FEATURE:      MazeMap area-resolution summary
// SURFACE:      node --test src/domain/report-area-summary.test.mjs
// WHY TOGETHER: Shared map evidence and separate room/corridor denominators form one contract.
// STATE:        Compact room and corridor summaries
// RULES:        Corridor samples never alter the room-visit resolution rate.
// PROVENANCE:   Dynamic room and long-corridor area resolution

import assert from "node:assert/strict";
import test from "node:test";

import { combineAreaResolutionSummaries }
  from "./report-area-summary.mjs";

test("area summary combines map evidence without collapsing denominators", () => {
  const roomObservation = { checkpointId: "room-1" };
  const corridorObservation = { checkpointId: "corridor-1" };
  const room = {
    visitCount: 2,
    resolutionPercent: 50,
    observations: [roomObservation],
    truthIssuePoints: [{ lng: 1, lat: 2, z: 3, weight: 1 }],
    ciscoIssuePoints: [{ lng: 4, lat: 5, z: 3, weight: 1 }],
  };
  const corridor = {
    sampleCount: 20,
    resolutionPercent: 90,
    observations: [corridorObservation],
    truthIssuePoints: [{ lng: 6, lat: 7, z: 3, weight: 2 }],
    ciscoIssuePoints: [{ lng: 8, lat: 9, z: 3, weight: 2 }],
  };
  const combined = combineAreaResolutionSummaries(room, corridor);
  assert.equal(combined.visitCount, 2);
  assert.equal(combined.resolutionPercent, 50);
  assert.equal(combined.corridor, corridor);
  assert.deepEqual(combined.areaObservations, [roomObservation, corridorObservation]);
  assert.equal(combined.truthIssuePoints.length, 2);
  assert.equal(combined.ciscoIssuePoints.length, 2);
});
