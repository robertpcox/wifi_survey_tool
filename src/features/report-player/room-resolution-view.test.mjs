// FEATURE:      Dynamic room-resolution report
// SURFACE:      node --test src/features/report-player/room-resolution-view.test.mjs
// WHY TOGETHER: Loading, empty, KPI, graph, and evidence markup share one report view.
// STATE:        Synthetic summary
// RULES:        Copy names both MazeMap truth and the raw Cisco blue dot.
// PROVENANCE:   Dynamic dwell room-resolution evidence

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
  const observation = {
    checkpointId: "checkpoint-1",
    roomLabel: "Clinic",
    expectedRoom: { name: "Clinic" },
    device: { name: "Phone <one>" },
    resolved: false,
    settleState: "not-resolved-at-exit",
    primary: {
      status: "wrong-room", ageSeconds: 21,
      room: { name: "Corridor" }, point: { lng: 1, lat: 2, z: 0 },
    },
  };
  const html = renderRoomResolutionView({ status: "ready", summary: {
    visitCount: 1, scoredVisitCount: 1, resolvedVisitCount: 0,
    failedVisitCount: 1, resolutionPercent: 0,
    settledDuringDwellCount: 0, stuckAtDwellEndCount: 1,
    primaryFailures: {
      "wrong-room": 1, unresolved: 0, "wrong-floor": 0, "no-displayed-fix": 0,
    },
    rooms: [{
      name: "Clinic", runCount: 1, visits: 1, resolved: 0,
      failures: 1, unscored: 0, settled: 0, stuck: 1,
    }],
    observations: [observation],
  } });
  assert.match(html, /observes raw Cisco for up to 20 seconds/);
  assert.match(html, /not extra failed\s+visits/);
  assert.match(html, /One majority verdict and timing outcome/);
  assert.match(html, /Room majority outcomes and timing/);
  assert.match(html, /No eligible dynamic intermediate marks/);
  assert.match(html, /Corridor/);
  assert.match(html, /Phone &lt;one&gt;/);
});

test("ready view renders corridor-only area evidence", () => {
  const html = renderRoomResolutionView({ status: "ready", summary: {
    visitCount: 0,
    corridor: {
      sampleCount: 2, scoredSampleCount: 2, resolvedSampleCount: 1,
      failedSampleCount: 1, unscoredSampleCount: 0, resolutionPercent: 50,
      corridors: [{
        name: "Ward corridor", runCount: 2, samples: 2, resolved: 1,
        failures: 1, resolutionPercent: 50, forward: 1, reverse: 1,
        forwardFailures: 0, reverseFailures: 1,
        bothDirections: true, bothFailureDirections: false,
      }],
      observations: [{
        checkpointId: "corridor-1", resolved: false, direction: "reverse",
        expectedRoom: { name: "Ward corridor" }, device: { name: "Tablet" },
        primary: {
          status: "wrong-room", point: { lng: 170.6, lat: -45.8, z: 0 },
        },
      }],
    },
  } });
  assert.match(html, /No eligible room stop\/dwell evidence/);
  assert.match(html, /Corridor walking samples/);
  assert.match(html, /whole corridor colour shows the exact resolved percentage/);
  assert.match(html, /Outside expected area/);
  assert.match(html, /Ward corridor/);
  assert.match(html, /Reverse/);
});
