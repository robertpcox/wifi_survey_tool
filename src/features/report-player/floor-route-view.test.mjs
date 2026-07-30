// FEATURE:      Report Player shared floor and route surface
// SURFACE:      node --test src/features/report-player/floor-route-view.test.mjs
// WHY TOGETHER: Fixture floors, MazeMap, fallback, and transport markup form one shared surface.
// STATE:        Parsed report fixture
// RULES:        No observed poll z-level creates a floor; canvas is only a labelled fallback.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { renderFloorRouteView } from "./floor-route-view.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("floor route view uses only ordered meta floor names and one map surface", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 15,
    accuracyM: 10,
  });
  const html = renderFloorRouteView(result, {
    analysis,
    thresholds: analysis.thresholds,
  });
  assert.ok(html.indexOf("Ground") < html.indexOf("First"));
  assert.match(html, /data-maze-map/);
  assert.match(html, /data-map-fallback hidden/);
  assert.match(html, /Route fallback/);
  assert.match(html, /Loading public campus map/);
  assert.match(html, /data-player-transport hidden/);
  assert.match(html, /data-module="mapAlerts"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /data-threshold="stickySeconds"/);
  assert.match(html, /data-threshold="accuracyM"/);
  for (const seconds of [10, 15, 20, 30]) {
    assert.match(html, new RegExp(`value="${seconds}"`));
  }
  for (const metres of [5, 10, 15, 20, 25]) {
    assert.match(html, new RegExp(`value="${metres}"`));
  }
  assert.match(html, /value="15" selected/);
  assert.match(html, />No-position-update heat</);
  assert.match(html, />No heat</);
  assert.match(html, /No-position-update route segment/);
  assert.match(html, /Wi-Fi result position on its reported floor/);
  assert.match(html, /Route endpoint/);
  assert.match(html, /Wi-Fi endpoint \(floor mismatch\)/);
  assert.equal((html.match(/data-report-map/g) ?? []).length, 1);
  assert.equal((html.match(/data-maze-map/g) ?? []).length, 1);
});
