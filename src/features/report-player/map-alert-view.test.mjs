// FEATURE:      Report Player on-map positioning warnings
// SURFACE:      node --test src/features/report-player/map-alert-view.test.mjs
// WHY TOGETHER: Report silence and current-time Player warnings share one map alert slot.
// STATE:        Pure warning fixtures
// RULES:        Player warnings appear only while their condition is active at the current time.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import test from "node:test";

import {
  renderAnalysisMapAlerts,
  renderPlayerMapAlerts,
} from "./map-alert-view.mjs";

const floors = [
  { z: 0, name: "Ground" },
  { z: 1, name: "First" },
];

test("Report map never renders the large warning banners", () => {
  assert.equal(renderAnalysisMapAlerts({
    warnings: {
      stalePosition: { active: true },
      floorMismatch: { active: true },
    },
  }), "");
});

test("Player time mode shows only current moving stale and wrong-floor conditions", () => {
  const context = {
    thresholds: { stickySeconds: 15, accuracyM: 10 },
    floors,
    highlightKind: "sticky",
  };
  const active = renderPlayerMapAlerts({
    latestFixAgeSeconds: 20.4,
    latestFix: { z: 1 },
    walker: { z: 0, moving: true },
  }, context);
  assert.match(active, /NO POSITION UPDATE · 20 S/i);
  assert.match(active, /WRONG FLOOR · SHOWS FIRST — ON GROUND/i);

  assert.equal(renderPlayerMapAlerts({
    latestFixAgeSeconds: 15,
    latestFix: { z: 0 },
    walker: { z: 0, moving: true },
  }, context), "");
  assert.doesNotMatch(renderPlayerMapAlerts({
    latestFixAgeSeconds: 50,
    latestFix: { z: 0 },
    walker: { z: 0, moving: false },
  }, context), /NO POSITION UPDATE/i);
});

test("Player distance mode compares the held fix with current route truth", () => {
  const context = {
    thresholds: { stickySeconds: 15, accuracyM: 10 },
    floors,
    highlightKind: "accuracy",
  };
  const active = renderPlayerMapAlerts({
    latestFixAgeSeconds: 50,
    latestFix: { lng: 0.0002, lat: 0, z: 1 },
    walker: { lng: 0, lat: 0, z: 0, moving: false },
  }, context);
  assert.match(active, /DISTANCE OFF ROUTE · 22 M/i);
  assert.match(active, /WRONG FLOOR · SHOWS FIRST — ON GROUND/i);
  assert.match(active, /data-map-alert-kind="position-error"/);
  assert.doesNotMatch(active, /NO POSITION UPDATE/i);

  assert.equal(renderPlayerMapAlerts({
    latestFixAgeSeconds: 50,
    latestFix: { lng: 0.00005, lat: 0, z: 0 },
    walker: { lng: 0, lat: 0, z: 0, moving: true },
  }, context), "");
});
