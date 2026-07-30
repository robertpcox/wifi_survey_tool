// FEATURE:      Report Player threshold heatmaps
// SURFACE:      renderHeatmapView(state)
// WHY TOGETHER: Selected-threshold legends, floor summaries, and heat totals are one analysis view.
// STATE:        None
// RULES:        Read floors and selected thresholds from shared analysis without mutating the result.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { esc } from "../../shared/format.mjs";

export function renderHeatmapView({ analysis, thresholds }) {
  return `
    <div class="section-heading">
      <div>
        <p class="section-kicker">Threshold analysis</p>
        <h2>Where it gets stuck</h2>
        <p class="threshold-summary">
          Change timeliness and accuracy beside the map to recalculate these results.
        </p>
      </div>
    </div>
    <div class="heat-legend">
      <span><i class="heat-dot sticky"></i>
        No position update beyond ${esc(formatThreshold(thresholds.stickySeconds))} s while ground truth moves
      </span>
      <span><i class="heat-dot accuracy"></i>
        Accuracy error beyond ${esc(formatThreshold(thresholds.accuracyM))} m
      </span>
    </div>
    <div class="heat-floor-grid">
      ${analysis.floors.map((floor, index) => floorCard(
        floor,
        analysis.heatmaps.sticky[index],
        analysis.heatmaps.accuracy[index],
        thresholds,
      )).join("")}
    </div>`;
}

function floorCard(floor, sticky, accuracy, thresholds) {
  const stickySeconds = weight(sticky?.points);
  const accuracySeconds = weight(accuracy?.points);
  return `
    <article class="heat-floor-card" data-floor="${esc(floor.z)}">
      <span>Floor ${esc(floor.z)}</span>
      <h3>${esc(floor.name)}</h3>
      <dl>
        <div>
          <dt>No-update heat (&gt; ${esc(formatThreshold(thresholds.stickySeconds))} s)</dt>
          <dd>${stickySeconds.toFixed(1)} s</dd>
        </div>
        <div>
          <dt>Accuracy heat (&gt; ${esc(formatThreshold(thresholds.accuracyM))} m)</dt>
          <dd>${accuracySeconds.toFixed(1)} s</dd>
        </div>
      </dl>
    </article>`;
}

function weight(points = []) {
  return points.reduce((total, point) => total + (point.weightSeconds || 0), 0);
}

function formatThreshold(value) {
  return Number.isInteger(value) ? String(value) : Number(value).toFixed(1);
}
