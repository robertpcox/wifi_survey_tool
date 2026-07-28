// FEATURE:      Report Player floor and route views
// SURFACE:      node --test src/features/report-player/floor-route-view.test.mjs
// WHY TOGETHER: Fixture floors and shared-surface markup prove this independent renderer.
// STATE:        Parsed report fixture
// RULES:        No observed poll z-level creates a floor option.
// PROVENANCE:   Scope/test_plan.md Step 5

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
  assert.match(html, /Public route map · embedded overlays/);
  assert.match(html, /data-private-map/);
  assert.equal((html.match(/data-report-map/g) ?? []).length, 1);
});
