// FEATURE:      Merged Report Player composition
// SURFACE:      node --test src/features/report-player/report-shell.test.mjs
// WHY TOGETHER: One fixture shell proves Report and full Player share one map and analysis context.
// STATE:        One analyzed fixture
// RULES:        Shell markup contains neither serialized result evidence nor an access default.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { renderReportShell } from "./report-shell.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("one map and one loaded context compose the Report and full Player", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
  });
  const html = renderReportShell({
    result,
    analysis,
    thresholds: analysis.thresholds,
    comparison: null,
  });
  for (const module of [
    "warnings", "floor-route", "mapAlerts", "kpi", "heatmap",
    "comparison", "methodology", "playback",
  ]) {
    assert.match(html, new RegExp(`data-module="${module}"`));
  }
  for (const playerPart of [
    "data-player-workspace",
    'data-report-pane="playback"',
    "player-evidence-rail",
    "data-player-transport",
    "data-player-snap",
    "data-player-charts",
  ]) {
    assert.match(html, new RegExp(playerPart));
  }
  assert.equal(count(html, "data-maze-map"), 1);
  assert.equal(count(html, "data-report-map"), 1);
  assert.equal(count(html, 'data-report-context="analysis"'), 1);
  assert.match(html, /data-toggle-map-access/);
  assert.match(html, /data-warning-kind="stale-position"/);
  assert.match(html, /NO POSITION UPDATE/i);
  assert.doesNotMatch(html, /data-module="timeline"|<h2[^>]*>Timeline<\/h2>/);
  assert.doesNotMatch(html, /"polls"\s*:|MAP_TOKEN|value="[^"]*access/i);
});

function count(value, fragment) {
  return value.split(fragment).length - 1;
}
