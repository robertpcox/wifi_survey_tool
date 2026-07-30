// FEATURE:      Merged Report Player composition
// SURFACE:      renderDynamicSections(state, candidates, allRuns)
// WHY TOGETHER: Every dynamic analysis section re-renders from one shared store snapshot.
// STATE:        None
// RULES:        Pure rendering; never reload, reparse, or mutate result evidence.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { renderComparisonView } from "./comparison-view.mjs";
import { renderDirectionView } from "./direction-view.mjs";
import { renderHeatmapView } from "./heatmap-view.mjs";
import { renderKpiView } from "./kpi-view.mjs";
import { renderMethodologyView } from "./methodology-view.mjs";
import { renderNoPositionView } from "./no-position-view.mjs";
import { renderReportInsights } from "./report-insights-view.mjs";
import { renderReportWarnings } from "./report-warning-view.mjs";

export function renderDynamicSections(state, candidates, allRuns = null) {
  return {
    mapAlerts: "",
    warnings: renderReportWarnings(state.analysis),
    kpi: renderKpiView(state.analysis),
    insights: renderReportInsights(state),
    direction: renderDirectionView(state),
    heatmap: renderHeatmapView(state),
    noPosition: renderNoPositionView(state),
    comparison: renderComparisonView({
      entries: candidates,
      comparison: state.comparison,
      allRuns,
    }),
    methodology: renderMethodologyView(state),
  };
}
