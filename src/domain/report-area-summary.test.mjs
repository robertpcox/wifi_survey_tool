// FEATURE:      MazeMap area-resolution summary
// SURFACE:      node --test src/domain/report-area-summary.test.mjs
// WHY TOGETHER: Shared map evidence and separate room/corridor denominators form one contract.
// STATE:        Compact room and corridor summaries
// RULES:        Corridor samples never alter the room-visit resolution rate.
// PROVENANCE:   Dynamic room and long-corridor area resolution

import assert from "node:assert/strict";
import test from "node:test";

import { aggregateAreaPolygons, combineAreaResolutionSummaries }
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

test("area polygons aggregate all dwell moments and corridor samples", () => {
  const polygon = { type: "Polygon", coordinates: [[
    [170.5, -45.8], [170.6, -45.8], [170.6, -45.7],
    [170.5, -45.7], [170.5, -45.8],
  ]] };
  const multiPolygon = { type: "MultiPolygon", coordinates: [[[
    [170.7, -45.8], [170.8, -45.8], [170.8, -45.7],
    [170.7, -45.7], [170.7, -45.8],
  ]]] };
  const areas = aggregateAreaPolygons([{
    resultId: "run-a", observationKind: "dwell",
    expectedRoom: { id: "clinic", name: "Clinic", z: 2, geometry: polygon },
    moments: [{ status: "resolved" }, { status: "wrong-room" },
      { status: "resolved" }],
  }, {
    resultId: "run-b", observationKind: "corridor-point",
    expectedRoom: { id: "clinic", name: "Clinic", z: 2, geometry: polygon },
    primary: { status: "resolved" },
  }, {
    resultId: "run-a", observationKind: "corridor-point",
    expectedRoom: { id: "hall", name: "Hall", z: 3, geometry: multiPolygon },
    primary: { status: "wrong-floor" },
  }]);
  assert.equal(areas.length, 2);
  const clinic = areas.find(item => item.poiId === "clinic");
  assert.equal(clinic.severity, "mixed");
  assert.equal(clinic.insideSampleCount, 3);
  assert.equal(clinic.outsideSampleCount, 1);
  assert.equal(clinic.runCount, 2);
  assert.equal(clinic.geometry, polygon);
  const hall = areas.find(item => item.poiId === "hall");
  assert.equal(hall.severity, "bad");
  assert.equal(hall.geometry.type, "MultiPolygon");
});

test("area polygon severity is deterministic for good, mixed, bad, and unscored", () => {
  const geometry = { type: "Polygon", coordinates: [[
    [0, 0], [1, 0], [1, 1], [0, 0],
  ]] };
  const observation = (id, statuses) => ({
    resultId: "run", observationKind: "dwell",
    expectedRoom: { id, name: id, z: 1, geometry },
    moments: statuses.map(status => ({ status })),
  });
  const areas = aggregateAreaPolygons([
    observation("good", ["resolved", "resolved"]),
    observation("mixed", ["resolved", "resolved", "wrong-room"]),
    observation("bad", ["resolved", "wrong-room"]),
    observation("unscored", ["lookup-unavailable"]),
  ]);
  assert.deepEqual(Object.fromEntries(areas.map(item => [item.poiId, item.severity])), {
    bad: "bad", mixed: "mixed", good: "good", unscored: "unscored",
  });
});
