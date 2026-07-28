// FEATURE:      Full-screen Report Player evidence rail
// SURFACE:      node --test src/features/report-player/player-evidence-view.test.mjs
// WHY TOGETHER: Moment metrics, poll pairs, snap tester, capture, charts, and raw evidence share one rail.
// STATE:        Parsed result fixture
// RULES:        Raw provider evidence stays disclosed and snap remains a visualization-only candidate.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { renderPlayerEvidenceRail } from "./player-evidence-view.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("evidence rail exposes linked moment, poll, snap, chart, and capture regions", () => {
  const html = renderPlayerEvidenceRail(result);
  for (const key of [
    "distance", "route-floor", "reported-floor", "fix-age", "request", "rtt",
  ]) {
    assert.match(html, new RegExp(`data-player-metric="${key}"`));
  }
  for (const region of [
    "data-player-pairs",
    "data-player-pair-detail",
    "data-player-snap-status",
    "data-player-charts",
    "data-player-capture",
    "data-player-raw",
  ]) {
    assert.match(html, new RegExp(region));
  }
  assert.match(html, />Ground</);
  assert.match(html, /raw blue fix is never changed or exported/i);
});
