// FEATURE:      Full-screen Report Player evidence detail
// SURFACE:      node --test src/features/report-player/player-evidence-detail.test.mjs
// WHY TOGETHER: Pair, timing, state, and snap labels explain one selected poll without changing it.
// STATE:        Deterministic poll evidence objects
// RULES:        Route positions say estimate; accepted and rejected snap labels include measured distance.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import test from "node:test";

import {
  pairMarkup,
  pairPickerMarkup,
  snapLabel,
  stateLabel,
} from "./player-evidence-detail.mjs";

const poll = {
  id: "poll-7",
  success: true,
  sentAt: "2026-07-28T01:00:13.900Z",
  receivedAt: "2026-07-28T01:00:14.000Z",
  roundTripMs: 100,
  httpStatus: 200,
  normalized: {
    lng: 170.5003, lat: -45.87, z: 0,
    fixTime: "2026-07-28T01:00:08.000Z",
  },
};

test("paired evidence labels both route positions as estimates and keeps returned fix visible", () => {
  const html = pairMarkup({
    poll,
    sentTruth: { lng: 170.5002, lat: -45.87, z: 0 },
    receivedTruth: { lng: 170.50025, lat: -45.87, z: 0 },
    identityChanged: false,
    coordinatesMoved: false,
  });
  assert.equal((html.match(/route estimate/g) ?? []).length, 2);
  assert.match(html, /170\.5003, -45\.87 · z 0/);
  assert.match(html, /Same position/);
  assert.match(html, /Provider confidence[\s\S]*?Not reported/);
  const withConfidence = pairMarkup({
    poll: { ...poll, normalized: { ...poll.normalized, confidence: 4.8768 } },
    identityChanged: false,
    coordinatesMoved: false,
  });
  assert.match(withConfidence, /± 4\.9 m/);
});

test("poll picker and status labels distinguish failures, freshness, floor, and snap outcome", () => {
  const picker = pairPickerMarkup({
    pollEvidence: {
      outcomes: [{ pollId: "poll-7", poll }],
      failures: [{ pollId: "poll-8", kind: "failure", success: false }],
    },
  }, "poll-7");
  assert.match(picker, /poll-7[\s\S]*paired/);
  assert.match(picker, /poll-8[\s\S]*failed/);
  assert.equal(stateLabel({ fix: poll.normalized, fixAge: 31, floorMatch: true }), "Frozen");
  assert.equal(stateLabel({ fix: poll.normalized, fixAge: 1, floorMatch: false }), "Wrong floor");
  assert.match(snapLabel({
    candidate: { lng: 170.5, lat: -45.87, z: 0 },
    accepted: true, distanceM: 3.24, radiusM: 5,
  }), /^Accepted · 3\.2 m/);
  assert.match(snapLabel({
    candidate: { lng: 170.5, lat: -45.87, z: 0 },
    accepted: false, distanceM: 8.1, radiusM: 5,
  }), /^Rejected · 8\.1 m/);
});
