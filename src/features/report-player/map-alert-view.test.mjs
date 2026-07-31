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
  renderConcernDetail,
  renderPlayerMapAlerts,
} from "./map-alert-view.mjs";

const floors = [
  { z: 0, name: "Ground" },
  { z: 1, name: "First" },
];

test("concern details render as a compact chip, never as an alert banner", () => {
  const html = renderConcernDetail({
    kind: "centre",
    binStartM: 10,
    binEndM: 15,
    forwardLockSeconds: 4,
    reverseLockSeconds: 4,
  });
  assert.match(html, /map-concern-chip/);
  assert.doesNotMatch(html, /map-alert-banner/);
  assert.match(html, /Dead centre · locks from both directions · 10–15 m/);
  const merged = renderConcernDetail({
    runCount: 3,
    lockSeconds: 42.4,
    medianErrorM: 4.21,
  });
  assert.match(merged, /map-concern-chip/);
  assert.match(merged, /3 run\(s\) · 42 s locked · median 4\.2 m/);
  assert.equal(renderConcernDetail({}), "");
});

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
