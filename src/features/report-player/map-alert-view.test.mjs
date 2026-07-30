// FEATURE:      Report Player on-map positioning warnings
// SURFACE:      node --test src/features/report-player/map-alert-view.test.mjs
// WHY TOGETHER: Aggregate and current-time warnings must use the same prominent language.
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

test("analysis map alerts summarize where the route gets stuck", () => {
  const html = renderAnalysisMapAlerts({
    thresholds: { stickySeconds: 15 },
    warnings: {
      stalePosition: {
        active: true,
        episodeCount: 169,
        worstSeconds: 42.854,
      },
      floorMismatch: {
        active: true,
        episodeCount: 8,
        worstSeconds: 81.524,
      },
    },
  });
  assert.match(html, /NO POSITION UPDATE &gt; 15 S · 169 EPISODES · WORST 43 S/i);
  assert.match(html, /FLOOR LEVEL DISCONNECT · 8 EPISODES · WORST 82 S/i);
  assert.match(html, /data-map-alert-kind="stale-position"/);
  assert.match(html, /data-map-alert-kind="floor-mismatch"/);
});

test("Player map alerts show only current stale and wrong-floor conditions", () => {
  const context = { thresholds: { stickySeconds: 15 }, floors };
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
