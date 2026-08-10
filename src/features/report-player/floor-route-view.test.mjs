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
  assert.match(html, /data-module="mapAlerts"[^>]*><\/div>/s);
  assert.match(html, /data-map-highlight/);
  assert.match(html, />Time since last update</);
  assert.match(html, />Distance off route</);
  assert.match(html, /data-threshold="stickySeconds"/);
  assert.match(html, /data-threshold="accuracyM"/);
  assert.match(html, /data-highlight-threshold="accuracy" hidden/);
  for (const seconds of [10, 15, 20, 30]) {
    assert.match(html, new RegExp(`value="${seconds}"`));
  }
  for (const metres of [5, 10, 15, 20, 25]) {
    assert.match(html, new RegExp(`value="${metres}"`));
  }
  assert.match(html, /value="15" selected/);
  assert.doesNotMatch(html, /data-map-heat=/);
  assert.doesNotMatch(html, />No heat</);
  assert.match(html, /No-position-update route segment/);
  assert.match(html, /Position error beyond the selected distance/);
  assert.match(html, /Wi-Fi result position on its reported floor/);
  assert.match(html, /Route endpoint/);
  assert.match(html, /Wi-Fi endpoint \(floor mismatch\)/);
  assert.equal((html.match(/data-report-map/g) ?? []).length, 1);
  assert.equal((html.match(/data-maze-map/g) ?? []).length, 1);
});

test("consolidated freeze mode describes continuous weighted path linework", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 15,
    accuracyM: 10,
  });
  const html = renderFloorRouteView(result, {
    analysis,
    thresholds: analysis.thresholds,
    consolidated: true,
  });
  assert.match(html, /Path sections that froze/);
  assert.match(html, /Walked path freeze · thicker\/darker = more seconds/);
  assert.match(html, /Whole-area resolved percentage:/);
  assert.match(html, /red = 0% · amber = 50% · green = 100%/);
  assert.match(html, /grey = unscored/);
  assert.match(html, /orange = surveyed position/);
  assert.match(html, /blue = raw Cisco position returned/);
  assert.match(html, /room window endpoint or corridor checkpoint/);
  assert.match(html, /green\/red\/orange rim = inside\/outside\/wrong floor/);
  assert.match(html, /blue dotted connector = same-floor expected → raw displacement/);
  assert.match(html, /catch-up states stay in report detail/);
  assert.doesNotMatch(html, /background heat = repeated failed samples/);
});

test("area legend renders the same red-amber-green scale as the polygon layer", async () => {
  const css = await readFile(new URL("room-resolution.css", import.meta.url), "utf8");
  assert.match(css,
    /linear-gradient\(90deg, #b91c1c 0%, #d97706 50%, #15803d 100%\)/);
});
