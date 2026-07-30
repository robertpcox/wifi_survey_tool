// FEATURE:      Same-survey result comparison
// SURFACE:      renderComparisonView(options)
// WHY TOGETHER: Candidate selection, device labels, lane metrics, deltas, and notes are one view.
// STATE:        None
// RULES:        Render only manifest-provided candidates and labels from domain comparison output.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { esc } from "../../shared/format.mjs";

const METRIC_GROUPS = Object.freeze([
  ["Accuracy · unique fixes at fix time", [
    ["fixCount", "Unique fixes"],
    ["fixMedianAccuracyM", "Median error (m)"],
    ["fixP95AccuracyM", "P95 error (m)"],
    ["withinConfidencePercent", "Within provider confidence (%)"],
  ]],
  ["Freshness · cloud pipeline", [
    ["fixIntervalMedianSeconds", "New fix every (s)"],
    ["deliveryLatencyMedianSeconds", "Delivery latency median (s)"],
    ["noFreshFixPercent", "No fresh fix while moving (%)"],
    ["medianLagBehindM", "Lag behind median (m)"],
  ]],
  ["Availability · network and coverage", [
    ["medianRttMs", "Median RTT (ms)"],
    ["noPositionPercent", "Effective no position (%)"],
    ["noPositionSeconds", "Effective no position (s)"],
  ]],
  ["Legacy blended · per poll at receipt", [
    ["stickySeconds", "No-update seconds"],
    ["outsideAccuracySeconds", "Outside tolerance seconds"],
    ["medianAccuracyM", "Median error at receipt (m)"],
  ]],
]);

export function renderComparisonView({ entries = [], comparison = null }) {
  const choices = entries.length
    ? `<label>Add completed run
        <select data-comparison-result>
          ${entries.map(entry => `
            <option value="${esc(entry.resultId)}">${esc(entryLabel(entry))}</option>`).join("")}
        </select>
      </label>
      <button type="button" data-add-comparison>Compare</button>`
    : `<p>No other completed matching runs are available.</p>`;
  return `
    <div class="section-heading">
      <div><p class="section-kicker">Comparison</p><h2>Same route, different device</h2></div>
      <div class="comparison-picker">${choices}</div>
    </div>
    ${comparison ? comparisonTable(comparison) : `
      <p class="empty-state">Choose another completed result to compare with this run.</p>`}`;
}

function comparisonTable(comparison) {
  return `
    <div class="comparison-table-wrap">
      <table>
        <thead><tr><th>Measure</th>${comparison.runs.map(run => `
          <th>${esc(run.label)}${run.baseline ? "<small>Oldest · baseline</small>" : ""}</th>`).join("")}
        </tr></thead>
        <tbody>${METRIC_GROUPS.map(([group, metrics]) => `
          <tr class="comparison-group"><th colspan="${comparison.runs.length + 1}">
            ${esc(group)}</th></tr>
          ${metrics.map(([key, label]) => `
          <tr><th>${esc(label)}</th>${comparison.runs.map(run => valueCell(run.values[key])).join("")}</tr>`).join("")}`
        ).join("")}</tbody>
      </table>
      <div class="run-notes">${comparison.runs.map(run => `
        <article><strong>${esc(run.label)}</strong>
          <p>${esc(run.operatorComment || "No operator comment.")}</p></article>`).join("")}
      </div>
    </div>`;
}

function valueCell(value) {
  const delta = value.delta > 0 ? `+${value.delta}` : value.delta;
  return `<td aria-label="${esc(value.label)}">
    <strong>${esc(value.absolute ?? "—")}</strong>
    <span>Δ ${esc(delta ?? "—")} · ${esc(value.label)}</span>
  </td>`;
}

function entryLabel(entry) {
  const device = entry.device ?? {};
  return `${device.name} · ${device.type} · ${device.os} · band ${entry.band}`;
}
