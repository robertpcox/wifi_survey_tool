// FEATURE:      Survey area-resolution report
// SURFACE:      node --test src/features/report-player/room-resolution-view.test.mjs
// WHY TOGETHER: Loading, empty, KPI, graph, and evidence markup share one report view.
// STATE:        Synthetic summary
// RULES:        Copy names both MazeMap truth and the raw Cisco blue dot.
// PROVENANCE:   Consolidated stop/dwell and corridor evidence

import assert from "node:assert/strict";
import test from "node:test";

import { renderRoomResolutionView } from "./room-resolution-view.mjs";

test("view explains unavailable lookup without inventing room failures", () => {
  assert.match(renderRoomResolutionView({ status: "unavailable" }),
    /no Cisco area failures are inferred/);
});

test("view clearly reports when private level polygons were not authorized", () => {
  const html = renderRoomResolutionView({
    status: "unavailable",
    error: new Error("Private MazeMap access is required; area results were not scored."),
  });
  assert.match(html, /Private MazeMap access is required/);
  assert.match(html, /not scored/);
});

test("ready view renders stationary KPIs, graph, room rank, and evidence", () => {
  const matchedRooms = Array.from({ length: 21 }, (_, index) => ({
    name: `North matched room ${index + 1}`, runCount: 1,
    visits: 1, resolved: 1, failures: 0, unscored: 0,
    settled: 0, drifted: 0, stuck: 0,
  }));
  const observation = {
    checkpointId: "checkpoint-1",
    roomLabel: "Clinic",
    device: { name: "Phone <one>" },
    expectedRoom: { id: "poi-42", identifier: "K01.07", name: "Clinic" },
    resolved: false,
    settleState: "not-resolved-at-exit",
    primary: {
      status: "wrong-room", ageSeconds: 21,
      outsideDistanceM: 2.4,
      room: { name: "Corridor" }, point: { lng: 1, lat: 2, z: 0 },
    },
  };
  const html = renderRoomResolutionView({ status: "ready", summary: {
    runCount: 4, visitCount: 22, scoredVisitCount: 22, resolvedVisitCount: 21,
    failedVisitCount: 1, resolutionPercent: 0,
    settledDuringDwellCount: 0, stuckAtDwellEndCount: 1,
    primaryFailures: {
      "wrong-room": 1, unresolved: 0, "wrong-floor": 0, "no-displayed-fix": 0,
    },
    rooms: [{
      poiId: "poi-42", identifier: "K01.07", name: "Clinic",
      maxOutsideDistanceM: 2.4, runCount: 1, visits: 1, resolved: 0,
      failures: 1, unscored: 0, settled: 0, stuck: 1,
    }, ...matchedRooms],
    observations: [observation],
  } });
  assert.match(html, /observes raw Cisco for up to 20 seconds/);
  assert.match(html, /not extra failed\s+visits/);
  assert.match(html, /One majority verdict and timing outcome/);
  assert.match(html, /4 contributing runs/);
  assert.match(html, /Room majority outcomes, identity, and boundary distance/);
  assert.match(html, /Room number \/ ID/);
  assert.match(html, /K01\.07/);
  assert.match(html, /2\.4 m/);
  assert.match(html, /North matched room 21/);
  assert.match(html, /No eligible intermediate checkpoints/);
  assert.match(html, /Corridor/);
  assert.match(html, /<th>Device<\/th>/);
  assert.match(html, /Phone &lt;one&gt;/);
});

test("ready view renders corridor-only area evidence", () => {
  const html = renderRoomResolutionView({ status: "ready", summary: {
    visitCount: 0,
    corridor: {
      sampleCount: 2, scoredSampleCount: 2, resolvedSampleCount: 1,
      failedSampleCount: 1, unscoredSampleCount: 0, resolutionPercent: 50,
      corridors: [{
        poiId: "corridor-42", identifier: "C02", name: "Ward corridor",
        maxOutsideDistanceM: 1.8, runCount: 2, samples: 2, resolved: 1,
        failures: 1, resolutionPercent: 50, forward: 1, reverse: 1,
        forwardFailures: 0, reverseFailures: 1,
        bothDirections: true, bothFailureDirections: false,
      }],
      observations: [{
        checkpointId: "corridor-1", resolved: false, direction: "reverse",
        device: { name: "Tablet" },
        expectedRoom: {
          id: "corridor-42", identifier: "C02", name: "Ward corridor",
        },
        primary: {
          status: "wrong-room", outsideDistanceM: 1.8,
          point: { lng: 170.6, lat: -45.8, z: 0 },
        },
      }],
    },
  } });
  assert.match(html, /No eligible room stop\/dwell evidence/);
  assert.match(html, /Corridor walking samples/);
  assert.match(html, /whole corridor colour shows the exact resolved percentage/);
  assert.match(html, /Outside expected area/);
  assert.match(html, /Ward corridor/);
  assert.match(html, /C02/);
  assert.match(html, /1\.8 m/);
  assert.match(html, /Reverse/);
  assert.match(html, /<th>Device<\/th>/);
  assert.match(html, /Tablet/);
});
