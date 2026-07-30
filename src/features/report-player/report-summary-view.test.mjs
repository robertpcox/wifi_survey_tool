// FEATURE:      Report issue summaries
// SURFACE:      node --test src/features/report-player/report-summary-view.test.mjs
// WHY TOGETHER: Ranked route identity and floor-lag evidence define the location summary.
// STATE:        Small deterministic insight projection
// RULES:        Duplicate display names stay visibly separate by immutable route position.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import test from "node:test";

import { renderReportSummary } from "./report-summary-view.mjs";

test("summary renders floor totals, distinct route zones, and floor lag rows", () => {
  const html = renderReportSummary({
    byFloor: [{
      z: 1, name: "Level 0", affectedSeconds: 125,
      episodeCount: 3, p95AccuracyM: 12.4,
    }],
    zones: [
      zone("stop-1", 100, 40),
      zone("stop-2", 800, 30),
    ],
    floorEpisodes: [{
      elapsedSeconds: 62,
      affectedSeconds: 18.2,
      reportedFloor: "Level 0",
      actualFloor: "Level 1",
      near: "Stairs",
    }],
  }, { stickySeconds: 15 });
  assert.match(html, /No-update time by floor/);
  assert.match(html, /data-zone-id="stop-1"/);
  assert.match(html, /data-zone-id="stop-2"/);
  assert.match(html, /Mapped point · 100 m/);
  assert.match(html, /Mapped point · 800 m/);
  assert.match(html, /Floor changes lag behind/);
  assert.match(html, /1:02/);
});

function zone(id, routeDistanceM, affectedSeconds) {
  return {
    id,
    name: "Mapped point",
    routeDistanceM,
    affectedSeconds,
    sampleCount: 2,
    z: 1,
  };
}
