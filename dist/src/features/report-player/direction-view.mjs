// FEATURE:      Report direction overlay view
// SURFACE:      renderDirectionView({ result, analysis })
// WHY TOGETHER: Mirror lock chart and flagged-spot table present one out-and-back comparison.
// STATE:        None
// RULES:        Both-direction lock is the hottest signal; one-direction effects read as latency.
// PROVENANCE:   NDH out-and-back corridor overlay contract

import { buildDirectionOverlay } from "../../domain/report-direction-overlay.mjs";
import { esc } from "../../shared/format.mjs";
import { CHART, chartX } from "./report-chart-svg.mjs";

const MID = 56;
const LANE = 42;

export function renderDirectionView({ result, analysis }) {
  const overlay = buildDirectionOverlay(result, analysis);
  const floors = analysis.floors.filter(floor => (
    overlay.bins.some(bin => bin.z === floor.z)
  ));
  return `
    <div class="section-heading">
      <div>
        <p class="section-kicker">Direction overlay</p>
        <h2>Where the corridor is problematic from both entry directions</h2>
      </div>
      <p>${esc(overlaySummaryLine(overlay))}</p>
    </div>
    <p class="diagnostic-intro">
      Bars above the line: no fresh fix while walking out. Below: while walking back
      (${esc(overlay.binSizeM)} m bins). Deep colour on both sides marks a spot the
      provider locks up in either direction — a dead zone, not latency. One-sided
      bars trail the walker and read as delivery lag.
    </p>
    ${floors.map(floor => floorChart(floor, overlay)).join("")}
    ${flaggedTable(overlay)}`;
}

function overlaySummaryLine(overlay) {
  const { lockBothWaysBins, rfIssueBins, singleDirectionLockBins } = overlay.summary;
  return `${lockBothWaysBins.length} spots lock both ways · `
    + `${rfIssueBins.length} spots off by > ${overlay.errorThresholdM} m both ways · `
    + `${singleDirectionLockBins.length} one-direction (latency) spots`;
}

function floorChart(floor, overlay) {
  const bins = overlay.bins.filter(bin => bin.z === floor.z);
  const maxLock = Math.max(1, ...bins.flatMap(bin => [
    bin.byDirection.forward.lockSeconds,
    bin.byDirection.reverse.lockSeconds,
  ]));
  const scale = seconds => Math.min(LANE, seconds / maxLock * LANE);
  const bars = bins.map(bin => {
    const x = chartX(bin.binStartM, overlay.axisLengthM);
    const width = Math.max(
      1.5,
      chartX(bin.binStartM + overlay.binSizeM, overlay.axisLengthM) - x - 0.6,
    );
    const hot = bin.lockBothWays ? " hot" : "";
    const forward = scale(bin.byDirection.forward.lockSeconds);
    const reverse = scale(bin.byDirection.reverse.lockSeconds);
    return `${forward > 0 ? `<rect class="dir-bar${hot}" x="${x}"
        y="${round(MID - forward)}" width="${round(width)}" height="${round(forward)}"></rect>` : ""}
      ${reverse > 0 ? `<rect class="dir-bar${hot}" x="${x}" y="${MID}"
        width="${round(width)}" height="${round(reverse)}"></rect>` : ""}
      ${bin.rfIssue ? `<circle class="dir-rf" cx="${round(x + width / 2)}" cy="6" r="4">
        <title>Error beyond ${overlay.errorThresholdM} m in both directions</title></circle>` : ""}`;
  }).join("");
  return `<figure class="diagnostic-panel direction-panel">
    <figcaption>${esc(floor.name)} · no-fresh-fix seconds by direction
      (max ${esc(maxLock.toFixed(1))} s per bin)</figcaption>
    <svg viewBox="0 0 ${CHART.width} 112" role="img"
      aria-label="Lock time by route position and walking direction on ${esc(floor.name)}">
      <line class="chart-grid" x1="${CHART.left}" x2="${CHART.width - CHART.right}"
        y1="${MID}" y2="${MID}"></line>
      ${bars}
      <text x="${CHART.left - 7}" y="${MID - LANE + 4}" text-anchor="end">out</text>
      <text x="${CHART.left - 7}" y="${MID + LANE}" text-anchor="end">back</text>
      <text class="chart-time" x="${CHART.left}" y="108">0 m</text>
      <text class="chart-time" x="${CHART.width - CHART.right}" y="108"
        text-anchor="end">${esc(Math.round(overlay.axisLengthM))} m</text>
    </svg>
  </figure>`;
}

function flaggedTable(overlay) {
  const flagged = overlay.bins.filter(bin => bin.lockBothWays || bin.rfIssue)
    .sort((left, right) => right.lockSeconds - left.lockSeconds)
    .slice(0, 8);
  if (!flagged.length) {
    return `<p class="request-summary is-clear">No spot locked or erred in
      both walking directions at the current thresholds.</p>`;
  }
  const rows = flagged.map(bin => `<tr>
      <td>${esc(Math.round(bin.binDistanceM))} m</td>
      <td>${esc(direction(bin.byDirection.forward))}</td>
      <td>${esc(direction(bin.byDirection.reverse))}</td>
      <td>${esc(metres(bin.meanErrorM))}</td>
      <td>${esc(metres(bin.deltaM))}</td>
      <td>${esc(verdict(bin))}</td>
    </tr>`).join("");
  return `<div class="report-table-scroll">
    <table>
      <thead><tr>
        <th>Route position</th><th>Out (lock · median err)</th>
        <th>Back (lock · median err)</th><th>Mean error</th>
        <th>Out−back delta</th><th>Reading</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function direction(stats) {
  return `${stats.lockSeconds.toFixed(1)} s · ${metres(stats.medianErrorM)}`;
}

function verdict(bin) {
  if (bin.rfIssue && bin.lockBothWays) return "Dead zone and offset — RF suspect";
  if (bin.rfIssue) return "Off in both directions — RF suspect";
  return "Locks both ways — dead zone";
}

function metres(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} m` : "—";
}

function round(value) {
  return Math.round(value * 10) / 10;
}
