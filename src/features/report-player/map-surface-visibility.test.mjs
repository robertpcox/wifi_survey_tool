// FEATURE:      Report map surface visibility
// SURFACE:      node --test src/features/report-player/map-surface-visibility.test.mjs
// WHY TOGETHER: Map and fallback states prove one atomic visibility helper.
// STATE:        Fake elements
// RULES:        Exactly one surface is visible after each transition.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import test from "node:test";

import { createMapSurfaceVisibility } from "./map-surface-visibility.mjs";

test("visibility switches between MazeMap and its labelled fallback", () => {
  const mapElement = { hidden: true };
  const fallbackElement = { hidden: false };
  const statusElement = { textContent: "" };
  const visibility = createMapSurfaceVisibility({
    mapElement, fallbackElement, statusElement,
  });
  visibility.showMap("Loading…");
  assert.deepEqual([mapElement.hidden, fallbackElement.hidden], [false, true]);
  visibility.showFallback();
  assert.deepEqual([mapElement.hidden, fallbackElement.hidden], [true, false]);
  assert.match(statusElement.textContent, /fallback active/);
});
