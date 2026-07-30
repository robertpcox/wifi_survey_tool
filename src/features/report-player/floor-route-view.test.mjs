// FEATURE:      Report Player shared floor and route surface
// SURFACE:      node --test src/features/report-player/floor-route-view.test.mjs
// WHY TOGETHER: Fixture floors, MazeMap, fallback, and transport markup form one shared surface.
// STATE:        Parsed report fixture
// RULES:        No observed poll z-level creates a floor; canvas is only a labelled fallback.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { renderFloorRouteView } from "./floor-route-view.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("floor route view uses only ordered meta floor names and one map surface", () => {
  const html = renderFloorRouteView(result);
  assert.ok(html.indexOf("Ground") < html.indexOf("First"));
  assert.match(html, /data-maze-map/);
  assert.match(html, /data-map-fallback hidden/);
  assert.match(html, /Route fallback/);
  assert.match(html, /Loading public campus map/);
  assert.match(html, /data-player-transport hidden/);
  assert.match(html, /Floor mismatch at inferred route position/);
  assert.equal((html.match(/data-report-map/g) ?? []).length, 1);
  assert.equal((html.match(/data-maze-map/g) ?? []).length, 1);
});
