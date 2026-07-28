// FEATURE:      Full-screen Report Player
// SURFACE:      node --test src/features/report-player/playback-view.test.mjs
// WHY TOGETHER: Player shell and evidence-rail markup are rendered from one already loaded result.
// STATE:        Parsed report fixture
// RULES:        Rendering performs no parsing, fetching, evidence mutation, or timer work.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { renderPlaybackView } from "./playback-view.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("playback view exposes the full moment evidence, snap, chart, and raw-evidence rail", () => {
  const html = renderPlaybackView(result);
  for (const marker of [
    "data-player-state",
    "data-player-pairs",
    "data-player-pair-detail",
    "data-player-snap",
    "data-player-snap-radius",
    "data-player-snap-status",
    "data-player-charts",
    "data-player-capture",
    "data-player-raw",
  ]) {
    assert.match(html, new RegExp(marker));
  }
  for (const label of [
    "Distance", "Route floor", "Reported floor", "Fix age", "Request", "Round trip",
  ]) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /raw blue fix is never changed or exported/i);
  assert.doesNotMatch(html, /"polls"\s*:/);
});
