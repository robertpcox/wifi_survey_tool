// FEATURE:      Report Player KPI summary
// SURFACE:      renderKpiView(analysis)
// WHY TOGETHER: Core run measures form one independently replaceable summary section.
// STATE:        None
// RULES:        Render elapsed-time metrics from the shared analysis without recalculating them.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { esc } from "../../shared/format.mjs";

const METRICS = Object.freeze([
  ["sampleCount", "Usable polls", value => value],
  ["medianRttMs", "Median RTT", value => unit(value, "ms")],
  ["medianAccuracyM", "Median error", value => unit(value, "m")],
  ["p95AccuracyM", "P95 error", value => unit(value, "m")],
  ["stickySeconds", "Sticky while moving", value => unit(value, "s")],
  ["outsideAccuracySeconds", "Outside tolerance", value => unit(value, "s")],
]);

export function renderKpiView(analysis) {
  const cards = METRICS.map(([key, label, format]) => `
    <article class="kpi-card">
      <span>${esc(label)}</span>
      <strong>${esc(format(analysis.metrics[key]))}</strong>
    </article>`).join("");
  return `
    <div class="section-heading">
      <div><p class="section-kicker">Summary</p><h2>Run at a glance</h2></div>
      <p>${esc(analysis.metrics.stickyPercent)}% sticky ·
        ${esc(analysis.metrics.outsideAccuracyPercent)}% outside tolerance</p>
    </div>
    <div class="kpi-grid">${cards}</div>`;
}

function unit(value, suffix) {
  return Number.isFinite(value) ? `${value.toFixed(1)} ${suffix}` : "—";
}
