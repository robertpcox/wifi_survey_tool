// FEATURE:      Same-survey result comparison
// SURFACE:      renderComparisonView(options)
// WHY TOGETHER: Candidate selection, device labels, absolute metrics, deltas, and notes are one view.
// STATE:        None
// RULES:        Render only manifest-provided candidates and labels from domain comparison output.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { esc } from "../../shared/format.mjs";

const DISPLAY_METRICS = Object.freeze([
  ["stickySeconds", "Sticky seconds"],
  ["outsideAccuracySeconds", "Outside tolerance seconds"],
  ["medianAccuracyM", "Median error (m)"],
  ["medianRttMs", "Median RTT (ms)"],
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
        <tbody>${DISPLAY_METRICS.map(([key, label]) => `
          <tr><th>${esc(label)}</th>${comparison.runs.map(run => valueCell(run.values[key])).join("")}</tr>`
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
