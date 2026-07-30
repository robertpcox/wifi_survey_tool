// FEATURE:      Report diagnostic series
// SURFACE:      renderReportSeries(insights, thresholds)
// WHY TOGETHER: Error, freshness, request timing, and floor tracking share one elapsed-time axis.
// STATE:        None
// RULES:        Failed requests remain visible; positional gaps are not filled with invented fixes.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import { esc } from "../../shared/format.mjs";
import {
  bucketExtremes,
  CHART,
  chartX,
  chartY,
  renderChartGrid,
  renderCriticalDots,
  renderOutageBands,
  renderTimeAxis,
} from "./report-chart-svg.mjs";

export function renderReportSeries(insights, thresholds) {
  const count = insights.timeline.length;
  const failures = insights.requestFailures.length;
  return `
    <div class="section-heading">
      <div>
        <p class="section-kicker">Full-run diagnostics</p>
        <h2>The walk, second by second</h2>
      </div>
      <p>${esc(count)} capture requests · ${esc(failures)} failed</p>
    </div>
    <p class="diagnostic-intro">
      Position error, time since the served fix changed, request time, and floor tracking
      share the same run clock. Red request bands are retained even though they have no position fix.
    </p>
    <div class="diagnostic-stack">
      ${metricPanel(insights, {
        key: "accuracyM",
        title: "Position error · reported fix versus route truth",
        unit: "m",
        threshold: thresholds.accuracyM,
        critical: point => point.outsideAccuracy,
      })}
      ${metricPanel(insights, {
        key: "fixAgeSeconds",
        title: "Time since last position update",
        unit: "s",
        threshold: thresholds.stickySeconds,
        critical: point => point.stale,
      })}
      ${metricPanel(insights, {
        key: "roundTripMs",
        title: "Position request round-trip",
        unit: "ms",
        critical: point => point.requestFailed,
        showOutages: true,
      })}
      ${floorPanel(insights)}
    </div>
    ${outageSummary(insights.requestOutages)}`;
}

function metricPanel(insights, options) {
  const values = insights.timeline.filter(point => Number.isFinite(point[options.key]));
  const max = Math.max(1, options.threshold ?? 0, ...values.map(point => point[options.key]));
  const plotted = bucketExtremes(values, options.key);
  const path = plotted.map((point, index) => (
    `${index ? "L" : "M"}${chartX(point.elapsedSeconds, insights.durationSeconds)},`
      + `${chartY(point[options.key], max)}`
  )).join(" ");
  const thresholdY = Number.isFinite(options.threshold)
    ? `<line class="chart-threshold" x1="${CHART.left}" x2="${CHART.width - CHART.right}"
        y1="${chartY(options.threshold, max)}" y2="${chartY(options.threshold, max)}"></line>`
    : "";
  return `<figure class="diagnostic-panel">
    <figcaption>${esc(options.title)} (${esc(options.unit)})</figcaption>
    <svg viewBox="0 0 ${CHART.width} 112" role="img" aria-label="${esc(options.title)}">
      ${options.showOutages ? renderOutageBands(insights) : ""}
      ${renderChartGrid(max, options.unit)}
      ${thresholdY}
      <path class="chart-series" d="${path}"></path>
      ${renderCriticalDots(values.filter(options.critical), insights, options.key, max)}
      ${renderTimeAxis(insights.durationSeconds)}
    </svg>
  </figure>`;
}

function floorPanel(insights) {
  const floors = insights.byFloor.map(floor => floor.z);
  const min = Math.min(...floors);
  const max = Math.max(...floors);
  const points = bucketExtremes(
    insights.timeline.filter(point => Number.isFinite(point.actualZ)),
    "reportedZ",
  );
  const floorY = z => max === min
    ? (CHART.top + CHART.bottom) / 2
    : chartY(z - min, max - min);
  const path = key => points.map((point, index) => (
    `${index ? "L" : "M"}${chartX(point.elapsedSeconds, insights.durationSeconds)},${floorY(point[key])}`
  )).join(" ");
  return `<figure class="diagnostic-panel floor-series">
    <figcaption>Floor · reported position versus route truth</figcaption>
    <svg viewBox="0 0 ${CHART.width} 112" role="img" aria-label="Reported and route-truth floor over time">
      ${renderOutageBands(insights)}
      ${insights.byFloor.map(floor => `<text x="${CHART.left - 7}" y="${floorY(floor.z) + 4}"
        text-anchor="end">${esc(floor.name)}</text>`).join("")}
      <path class="chart-floor-truth" d="${path("actualZ")}"></path>
      <path class="chart-series" d="${path("reportedZ")}"></path>
      ${renderCriticalDots(points.filter(point => point.wrongFloor), insights, "reportedZ", max - min, min)}
      ${renderTimeAxis(insights.durationSeconds)}
    </svg>
  </figure>`;
}

function outageSummary(outages) {
  if (!outages.length) return `<p class="request-summary is-clear">No capture request outage was recorded.</p>`;
  const worst = [...outages].sort((a, b) => b.durationSeconds - a.durationSeconds)[0];
  return `<p class="request-summary"><strong>Request outage:</strong>
    ${esc(worst.requestCount)} failed requests across ${esc(worst.durationSeconds.toFixed(1))} s;
    worst request ${esc((worst.worstRoundTripMs / 1000).toFixed(1))} s.
    ${esc(worst.error ?? "")}</p>`;
}
