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
    "warnings", "floor-route", "mapAlerts", "kpi", "insights", "direction",
    "heatmap", "noPosition", "rooms", "comparison", "methodology", "playback",
  ]) {
    assert.match(html, new RegExp(`data-module="${module}"`));
  }
  assert.ok(
    html.indexOf('data-module="noPosition"') > html.indexOf('data-module="heatmap"'),
    "no-position section renders after the chart diagnostics",
  );
  assert.ok(
    html.indexOf('data-module="noPosition"') < html.indexOf('data-module="comparison"'),
    "no-position section renders before comparison",
  );
  assert.match(html, /data-report-view="overview">Campus overview/);
  assert.match(html, /data-report-pane="overview"[^>]*hidden/);
  assert.match(html, /data-module="overview"/);
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
  assert.doesNotMatch(html, /map-section is-consolidated/);
  assert.match(html, /data-toggle-map-access/);
  assert.match(html, /data-warning-kind="stale-position"/);
  assert.match(html, /NO POSITION UPDATE/i);
  assert.match(html, /The walk, second by second/);
  assert.match(html, /Top no-update locations/);
  assert.doesNotMatch(html, /data-module="timeline"|<h2[^>]*>Timeline<\/h2>/);
  assert.doesNotMatch(html, /"polls"\s*:|MAP_TOKEN|value="[^"]*access/i);
});

function count(value, fragment) {
  return value.split(fragment).length - 1;
}

test("consolidated shell exposes overview without seed-run modes", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
  });
  const html = renderReportShell({
    result,
    analysis,
    thresholds: analysis.thresholds,
    comparison: null,
    view: "overview",
    consolidated: true,
  });
  assert.match(html, /data-report-view="overview">Consolidated report/);
  assert.doesNotMatch(html, /data-report-view="analysis"/);
  assert.doesNotMatch(html, /data-report-view="playback"/);
  assert.match(html, /data-report-pane="overview" class="analysis-pane">/);
  assert.match(html, /data-report-context="analysis" hidden/);
  assert.match(html, /data-module="runSelection"/);
  assert.match(html, /class="report-section map-section is-consolidated"/);
  assert.match(html, /data-access-required="true"/);
  assert.match(html, /MazeMap access required for area resolution/);
  assert.match(html, /Continue without area resolution/);
  assert.doesNotMatch(html, /data-access-required="true"[^>]*hidden/);
});

test("a direct planned report with area checkpoints requires private access", () => {
  const analysis = analyzeReportResult(result, { stickySeconds: 2, accuracyM: 5 });
  const html = renderReportShell({
    result, analysis, thresholds: analysis.thresholds,
    comparison: null, view: "analysis", consolidated: false,
  });
  assert.match(html, /data-access-required="true"/);
  assert.match(html, /MazeMap access required for area resolution/);
});

test("an excluded direct result does not request private area access", () => {
  const analysis = analyzeReportResult(result, { stickySeconds: 2, accuracyM: 5 });
  const html = renderReportShell({
    result, analysis, thresholds: analysis.thresholds,
    comparison: null, view: "analysis", consolidated: false,
    exceptions: [{ disposition: "exclude-run" }],
  });
  assert.match(html, /data-access-required="false"/);
  assert.doesNotMatch(html, /data-access-required="true"/);
});

test("dashboard-supplied access starts with its report controls concealed", () => {
  const analysis = analyzeReportResult(result, { stickySeconds: 2, accuracyM: 5 });
  const html = renderReportShell({
    result, analysis, thresholds: analysis.thresholds,
    comparison: null, view: "analysis", consolidated: false,
  }, [], { dashboardSupplied: true });
  assert.match(html, /data-toggle-map-access[^>]* hidden/);
  assert.match(html, /data-map-access-panel[^>]*data-access-required="true"[^>]* hidden/);
  assert.doesNotMatch(html, /<input[^>]*data-map-access[^>]*\bvalue=|dashboard-access/);
});
