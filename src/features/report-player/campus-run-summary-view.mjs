// FEATURE:      Consolidated run summary
// SURFACE:      renderCampusRunSummary(overview)
// WHY TOGETHER: Moving no-update, lag, availability KPIs, graph, and run table form one lane.
// STATE:        None
// RULES:        Keep moving Cisco metrics separate from stationary room-resolution outcomes.
// PROVENANCE:   Campus-level consolidated report

import { esc } from "../../shared/format.mjs";

export function renderCampusRunSummary(overview) {
  const maximumLag = Math.max(
    1,
    ...overview.runs.map(run => run.medianLagBehindM ?? 0),
  );
  return `<div class="campus-run-summary">
    <div class="room-resolution-kpis campus-summary-kpis">
      ${card("Eligible runs", overview.runCount, "reviewed exclusions applied")}
      ${card("No-update time", `${one(overview.metrics.totalStickySeconds)} s`, "moving route evidence")}
      ${card("Median trailing lag", `${one(overview.metrics.medianRunLagBehindM)} m`, "positive lag only")}
      ${card("Median no position", `${one(overview.metrics.medianRunNoPositionPercent)}%`, "across eligible runs")}
    </div>
    <figure class="room-issue-graph campus-lag-graph">
      <figcaption>Positive Cisco lag behind route by run</figcaption>
      ${overview.runs.slice(0, 12).map(run => `<div>
        <span>${esc(runLabel(run))}</span>
        <i><b style="width:${(run.medianLagBehindM ?? 0) / maximumLag * 100}%"></b></i>
        <strong>${esc(one(run.medianLagBehindM))} m</strong>
      </div>`).join("")}
    </figure>
    <details><summary>Run-by-run moving evidence</summary>
      <div class="report-table-scroll"><table><thead><tr>
        <th>Run</th><th>No update</th><th>Median lag</th><th>No position</th>
      </tr></thead><tbody>${overview.runs.map(run => `<tr>
        <th>${esc(run.surveyName)}<small>${esc(run.startedAt)}</small></th>
        <td>${esc(one(run.stickySeconds))} s</td>
        <td>${esc(one(run.medianLagBehindM))} m</td>
        <td>${esc(one(run.noPositionPercent))}%</td>
      </tr>`).join("")}</tbody></table></div>
    </details>
  </div>`;
}

function card(label, value, detail) {
  return `<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></article>`;
}

function one(value) {
  return Number.isFinite(value) ? Number(value).toFixed(1) : "—";
}

function runLabel(run) {
  const survey = String(run.surveyName ?? "Survey run");
  const id = String(run.resultId ?? "").slice(0, 8);
  return id ? `${survey} · ${id}` : survey;
}
