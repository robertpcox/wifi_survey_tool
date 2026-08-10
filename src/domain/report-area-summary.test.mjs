// FEATURE:      MazeMap area-resolution summary
// SURFACE:      node --test src/domain/report-area-summary.test.mjs
// WHY TOGETHER: Shared map evidence and separate room/corridor denominators form one contract.
// STATE:        Compact room and corridor summaries
// RULES:        Corridor samples never alter the room-visit resolution rate.
// PROVENANCE:   All-run room and long-corridor area resolution

import assert from "node:assert/strict";
import test from "node:test";

import { aggregateAreaPolygons, combineAreaResolutionSummaries }
  from "./report-area-summary.mjs";

test("area summary combines map evidence without collapsing denominators", () => {
  const roomObservation = { checkpointId: "room-1", resultId: "run-a" };
  const corridorObservation = { checkpointId: "corridor-1", resultId: "run-b" };
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
  assert.equal(combined.runCount, 2);
  assert.equal(combined.observationCount, 2);
  assert.deepEqual(combined.runIds, ["run-a", "run-b"]);
  assert.deepEqual(combined.areaObservations, [roomObservation, corridorObservation]);
  assert.equal(combined.truthIssuePoints.length, 2);
  assert.equal(combined.ciscoIssuePoints.length, 2);
});

test("area polygons count one majority verdict per room visit and corridor sample", () => {
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
    primary: { status: "resolved" },
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
  assert.equal(clinic.severity, "good");
  assert.equal(clinic.insideSampleCount, 2);
  assert.equal(clinic.outsideSampleCount, 0);
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
  const observation = (id, status) => ({
    resultId: "run", observationKind: "dwell", primary: { status },
    expectedRoom: { id, name: id, z: 1, geometry },
  });
  const areas = aggregateAreaPolygons([
    observation("good", "resolved"), observation("good", "resolved"),
    observation("good", "wrong-room"),
    observation("mixed", "resolved"), observation("mixed", "wrong-room"),
    observation("bad", "resolved"), observation("bad", "wrong-room"),
    observation("bad", "wrong-room"),
    observation("unscored", "lookup-unavailable"),
  ]);
  assert.deepEqual(Object.fromEntries(areas.map(item => [item.poiId, item.severity])), {
    bad: "bad", mixed: "mixed", good: "good", unscored: "unscored",
  });
});
