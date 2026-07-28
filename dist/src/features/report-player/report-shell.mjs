// FEATURE:      Merged Report Player composition
// SURFACE:      renderLoadPanel(message), renderReportShell(state, candidates)
// WHY TOGETHER: One page shell allocates independent report modules around the shared map context.
// STATE:        None
// RULES:        Embed no result literal; each section receives the already loaded shared objects.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { renderComparisonView } from "./comparison-view.mjs";
import { renderFloorRouteView } from "./floor-route-view.mjs";
import { renderHeatmapView } from "./heatmap-view.mjs";
import { renderIdentityView } from "./identity-view.mjs";
import { renderKpiView } from "./kpi-view.mjs";
import { renderMapAccess } from "./map-access.mjs";
import { renderMethodologyView } from "./methodology-view.mjs";
import { renderPlaybackView } from "./playback-view.mjs";
import { renderTimelineView } from "./timeline-view.mjs";

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
          data-report-view="playback">Playback</button>
      </div>
      <p data-report-status>One result loaded once · thresholds update live</p>
    </div>
    ${renderIdentityView(result)}
    ${renderMapAccess(result)}
    <section class="report-section map-section" data-module="floor-route">
      ${renderFloorRouteView(result)}
    </section>
    <div data-report-pane="analysis">
      <section class="report-section" data-module="kpi">${renderKpiView(analysis)}</section>
      <section class="report-section" data-module="heatmap">
        ${renderHeatmapView({ analysis, thresholds })}
      </section>
      <section class="report-section" data-module="timeline">
        ${renderTimelineView(result)}
      </section>
      <section class="report-section" data-module="comparison">
        ${renderComparisonView({ entries: candidates, comparison })}
      </section>
      <section class="report-section" data-module="methodology">
        ${renderMethodologyView({ result, analysis })}
      </section>
    </div>
    <div data-report-pane="playback" hidden>
      <section class="report-section" data-module="playback">
        ${renderPlaybackView(result)}
      </section>
    </div>`;
}
