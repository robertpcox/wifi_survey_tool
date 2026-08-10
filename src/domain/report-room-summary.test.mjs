// FEATURE:      Consolidated room-resolution summary
// SURFACE:      node --test src/domain/report-room-summary.test.mjs
// WHY TOGETHER: Room, run, status, and map-point aggregates prove one summary contract.
// STATE:        Synthetic scored visits
// RULES:        Room identity beats grid/name and truth/fix issue points remain separate.
// PROVENANCE:   Dynamic dwell room-resolution evidence

import assert from "node:assert/strict";
import test from "node:test";

import { buildRoomResolutionSummary } from "./report-room-summary.mjs";

const visit = (resultId, resolved, overrides = {}) => ({
  resultId,
  roomLabel: "Clinic",
  target: { lng: 170.5, lat: -45.8, z: 1 },
  expectedRoom: { id: "poi-1", name: "Clinic", z: 1 },
  observationKind: "dwell",
  settleState: resolved ? "already-resolved" : "not-resolved-at-exit",
  stuckThroughDwell: !resolved,
  scored: true,
  resolved,
  primary: {
    status: resolved ? "resolved" : "wrong-room",
    point: { lng: resolved ? 170.5 : 170.6, lat: -45.8, z: 1 },
  },
  device: { name: resultId },
  ...overrides,
});

test("summary ranks POI rooms and separates truth from Cisco issue positions", () => {
  const summary = buildRoomResolutionSummary([
    visit("run-a", true),
    visit("run-b", false),
    visit("run-c", true, {
      settleState: "resolved-during-dwell",
      entry: { point: { lng: 170.7, lat: -45.8, z: 1 } },
    }),
  ]);
  assert.equal(summary.visitCount, 3);
  assert.equal(summary.scoredVisitCount, 3);
  assert.equal(summary.resolvedVisitCount, 2);
  assert.equal(summary.failedVisitCount, 1);
  assert.equal(summary.resolutionPercent, 66.7);
  assert.equal(summary.rooms.length, 1);
  assert.equal(summary.rooms[0].runCount, 3);
  assert.equal(summary.truthIssuePoints[0].lng, 170.5);
  assert.equal(summary.ciscoIssuePoints[0].lng, 170.6);
  assert.ok(summary.ciscoIssuePoints.some(point => point.lng === 170.7));
});

test("intermediate dwell failures remain geographic issues after a resolved exit", () => {
  const resolved = visit("run-a", true, {
    firstResolutionLagSeconds: 3,
    dwellScoredSeconds: 5,
    dwellResolvedSeconds: 2,
    dwellFailureMomentCount: 1,
    settleState: "resolved-during-dwell",
    moments: [{
      status: "wrong-room", point: { lng: 170.8, lat: -45.8, z: 1 },
    }, {
      status: "resolved", point: { lng: 170.5, lat: -45.8, z: 1 },
    }],
  });
  const summary = buildRoomResolutionSummary([resolved]);
  assert.equal(summary.failedVisitCount, 0);
  assert.equal(summary.medianSettleSeconds, 3);
  assert.equal(summary.dwellResolutionPercent, 40);
  assert.equal(summary.ciscoIssuePoints[0].lng, 170.8);
  assert.equal(summary.rooms[0].drifted, 1);
});
