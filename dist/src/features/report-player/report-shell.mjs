// FEATURE:      Merged Report Player composition
// SURFACE:      renderLoadPanel(message), renderReportShell(state, candidates)
// WHY TOGETHER: One page shell allocates Report flow and full-screen Player around one shared map.
// STATE:        None
// RULES:        Embed no result literal; each section receives the already loaded shared objects.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { renderComparisonView } from "./comparison-view.mjs";
import { renderDirectionView } from "./direction-view.mjs";
import { renderFloorRouteView } from "./floor-route-view.mjs";
import { renderHeatmapView } from "./heatmap-view.mjs";
import { renderIdentityView } from "./identity-view.mjs";
import { renderKpiView } from "./kpi-view.mjs";
import { renderMapAccess } from "./map-access.mjs";
import { renderMethodologyView } from "./methodology-view.mjs";
import { renderNoPositionView } from "./no-position-view.mjs";
import { renderPlaybackView } from "./playback-view.mjs";
import { renderReportInsights } from "./report-insights-view.mjs";
import { renderReportWarnings } from "./report-warning-view.mjs";

export function renderLoadPanel(message = "Choose a generated result or upload a v3 result file.") {
  return `
    <section class="load-panel shell-card">
      <p class="eyebrow">Report Player</p>
      <h1>Analyze and replay one run</h1>
      <p data-report-status>${message}</p>
      <label class="file-picker">Local v3 result
        <input type="file" accept=".json,application/json" data-result-upload>
      </label>
    </section>`;
}

export function renderReportShell(state, candidates = []) {
  const { result, analysis, thresholds, comparison } = state;
  return `
    <div class="report-toolbar">
      <div role="tablist" aria-label="Report Player mode">
        <button type="button" role="tab" aria-selected="true"
          data-report-view="analysis">Analysis</button>
        <button type="button" role="tab" aria-selected="false"
          data-report-view="playback">Player</button>
      </div>
      <div class="report-toolbar-actions">
        <p data-report-status>One result · one analysis · one map</p>
        <button type="button" data-toggle-map-access aria-expanded="false"
          aria-controls="report-map-access">
          Map access token
        </button>
      </div>
    </div>
    <div data-report-context="analysis">
      ${renderIdentityView(result)}
      <section data-module="warnings">${renderReportWarnings(analysis)}</section>
    </div>
    ${renderMapAccess(result)}
    <div class="shared-map-workspace" data-player-workspace>
      <section class="report-section map-section" data-module="floor-route">
        ${renderFloorRouteView(result, { analysis, thresholds })}
      </section>
      <div class="player-pane" data-report-pane="playback" hidden>
        <section data-module="playback">${renderPlaybackView(result)}</section>
      </div>
    </div>
    <div data-report-pane="analysis" class="analysis-pane">
      <section class="report-section" data-module="kpi">${renderKpiView(analysis)}</section>
      <section class="report-section" data-module="insights">
        ${renderReportInsights(state)}
      </section>
      <section class="report-section" data-module="direction">
        ${renderDirectionView(state)}
      </section>
      <section class="report-section" data-module="heatmap">
        ${renderHeatmapView({ analysis, thresholds })}
      </section>
      <section class="report-section" data-module="noPosition">
        ${renderNoPositionView(state)}
      </section>
      <section class="report-section" data-module="comparison">
        ${renderComparisonView({ entries: candidates, comparison })}
      </section>
      <section class="report-section" data-module="methodology">
        ${renderMethodologyView({ result, analysis })}
      </section>
    </div>`;
}
