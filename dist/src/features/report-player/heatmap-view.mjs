// FEATURE:      Report Player threshold heatmaps
// SURFACE:      renderHeatmapView(state)
// WHY TOGETHER: Threshold controls, legends, floor summaries, and heat totals are one analysis view.
// STATE:        None
// RULES:        Read floors from shared analysis and emit controls without mutating the result.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { esc } from "../../shared/format.mjs";

export function renderHeatmapView({ analysis, thresholds }) {
  return `
    <div class="section-heading">
      <div><p class="section-kicker">Threshold analysis</p><h2>Where quality breaks down</h2></div>
      <div class="threshold-controls">
        ${thresholdInput("Sticky freshness", "stickySeconds", thresholds.stickySeconds, "seconds")}
        ${thresholdInput("Accuracy distance", "accuracyM", thresholds.accuracyM, "metres")}
      </div>
    </div>
    <div class="heat-legend">
      <span><i class="heat-dot sticky"></i> Sticky time while ground truth moves</span>
      <span><i class="heat-dot accuracy"></i> Time outside accuracy tolerance</span>
    </div>
    <div class="heat-floor-grid">
      ${analysis.floors.map((floor, index) => floorCard(
        floor,
        analysis.heatmaps.sticky[index],
        analysis.heatmaps.accuracy[index],
      )).join("")}
    </div>`;
}

function thresholdInput(label, name, value, unit) {
  return `
    <label>${esc(label)}
      <span><input type="number" min="0" step="0.5" value="${esc(value)}"
        data-threshold="${name}"> ${esc(unit)}</span>
    </label>`;
}

function floorCard(floor, sticky, accuracy) {
  const stickySeconds = weight(sticky?.points);
  const accuracySeconds = weight(accuracy?.points);
  return `
    <article class="heat-floor-card" data-floor="${esc(floor.z)}">
      <span>Floor ${esc(floor.z)}</span>
      <h3>${esc(floor.name)}</h3>
      <dl>
        <div><dt>Sticky heat</dt><dd>${stickySeconds.toFixed(1)} s</dd></div>
        <div><dt>Accuracy heat</dt><dd>${accuracySeconds.toFixed(1)} s</dd></div>
      </dl>
    </article>`;
}

function weight(points = []) {
  return points.reduce((total, point) => total + (point.weightSeconds || 0), 0);
}
