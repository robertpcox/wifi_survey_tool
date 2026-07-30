// FEATURE:      Report issue intelligence
// SURFACE:      renderReportInsights(state)
// WHY TOGETHER: One dynamic Report section composes full-run series and location summaries.
// STATE:        None
// RULES:        Rebuild only from the loaded result and selected live thresholds.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import { buildReportInsights } from "../../domain/report-insights.mjs";
import { renderReportSeries } from "./report-series-view.mjs";
import { renderReportSummary } from "./report-summary-view.mjs";

export function renderReportInsights({ result, analysis, thresholds = analysis.thresholds }) {
  const insights = buildReportInsights(result, analysis);
  return `
    <div class="report-insights">
      ${renderReportSeries(insights, thresholds)}
      ${renderReportSummary(insights, thresholds)}
    </div>`;
}
