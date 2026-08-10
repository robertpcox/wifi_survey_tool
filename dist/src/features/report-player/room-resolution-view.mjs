// FEATURE:      Survey area-resolution report
// SURFACE:      renderRoomResolutionView(options)
// WHY TOGETHER: Stationary KPI, issue graph, room ranking, and evidence table form one report.
// STATE:        None
// RULES:        Label MazeMap as truth and Cisco Spaces as the unsnapped observed blue dot.
// PROVENANCE:   Consolidated stop/dwell and corridor evidence

import { esc } from "../../shared/format.mjs";
import { renderCorridorResolution }
  from "./corridor-resolution-view.mjs";
import { renderRoomResolutionEvidence }
  from "./room-resolution-evidence-view.mjs";

export function renderRoomResolutionView({ status, summary, error = null }) {
  if (status !== "ready") return pending(status, error);
  if (!summary.visitCount && !summary.corridor?.sampleCount) {
    return `<div class="room-resolution-empty">
    <h3>MazeMap area resolution</h3>
    <p>No eligible room stops or corridor checkpoints are present in these runs.</p>
  </div>`;
  }
  return `<div class="room-resolution-report">
    <header>
      <p class="section-kicker">Raw Cisco versus MazeMap areas</p>
      <h3>Did the blue dot resolve in the expected room or corridor?</h3>
      <p>Each room visit observes raw Cisco for up to 20 seconds and uses the
        majority of scored time for one visit verdict. Corridors use repeated
        walking marks. Catch-up states remain timing evidence, not extra failed
        visits. Area fill shows the exact resolved percentage. Orange points show
        surveyed positions; blue points show raw Cisco at each corridor mark or
        at the end of the 20 s / available room window. Dotted lines show their
        same-floor displacement. Snap-to-path never enters either score.</p>
      <p><strong>${esc(summary.runCount ?? 0)} contributing runs:</strong>
        ${esc(summary.visitCount)} room stops and
        ${esc(summary.corridor?.sampleCount ?? 0)} corridor checkpoints.</p>
    </header>
    ${summary.visitCount ? `${summaryCards(summary)}${issueGraph(summary)}
      ${roomTable(summary)}${renderRoomResolutionEvidence(summary)}` : roomEmpty()}
    ${renderCorridorResolution(summary.corridor)}
  </div>`;
}
function pending(status, error) {
  const messages = {
    idle: "Area evidence waits for the campus map.",
    loading: "Resolving MazeMap polygons for room and corridor Cisco fixes…",
    unavailable: error?.message
      || "Area lookup is unavailable; no Cisco area failures are inferred.",
    error: error?.message || "Area evidence could not be resolved.",
  };
  return `<div class="room-resolution-empty" data-room-resolution-status="${esc(status)}">
    <h3>MazeMap area resolution</h3><p>${esc(messages[status] ?? messages.idle)}</p>
  </div>`;
}
function roomEmpty() {
  return `<div class="room-resolution-empty"><h4>Room stops</h4>
    <p>No eligible room stop/dwell evidence is present.</p></div>`;
}
function summaryCards(summary) {
  const rate = summary.resolutionPercent == null
    ? "—"
    : `${summary.resolutionPercent.toFixed(1)}%`;
  return `<div class="room-resolution-kpis">
    ${card("Majority-inside visits", rate, `${summary.scoredVisitCount} scored visits`)}
    ${card("Majority-outside visits", summary.failedVisitCount, "one verdict per visit")}
    ${card("Caught up within 20 s", summary.settledDuringDwellCount, "timing evidence, not extra failures")}
    ${card("Observed time inside", percent(summary.dwellResolutionPercent),
    `${one(summary.dwellScoredSeconds)} scored seconds`)}
    ${card("Median settle time", seconds(summary.medianSettleSeconds),
    `p95 ${seconds(summary.p95SettleSeconds)}`)}
    ${card("Stuck through visit", summary.stuckAtDwellEndCount, "same Cisco position at exit")}
  </div>`;
}
function card(label, value, detail) {
  return `<article><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small></article>`;
}
function issueGraph(summary) {
  const bars = [
    ["Wrong room", summary.primaryFailures["wrong-room"]],
    ["Outside mapped room/area", summary.primaryFailures.unresolved],
    ["Wrong floor", summary.primaryFailures["wrong-floor"]],
    ["No Cisco fix", summary.primaryFailures["no-displayed-fix"]],
    ["Caught up within 20 s", summary.settledDuringDwellCount],
    ["Lost resolution", summary.lostResolutionCount],
    ["Intermittent in dwell", summary.intermittentResolutionCount],
    ["Temporary resolution", summary.temporaryResolutionCount],
  ];
  const normalized = bars.map(([label, value]) => [label, Number(value) || 0]);
  const maximum = Math.max(1, ...normalized.map(([, value]) => value));
  return `<figure class="room-issue-graph">
    <figcaption>One majority verdict and timing outcome per eligible visit</figcaption>
    ${normalized.map(([label, value]) => `<div>
      <span>${esc(label)}</span><i><b style="width:${value / maximum * 100}%"></b></i>
      <strong>${esc(value)}</strong>
    </div>`).join("")}
  </figure>`;
}
function roomTable(summary) {
  const rows = summary.rooms
    .filter(room => room.failures || room.unscored || room.settled
      || room.drifted || room.stuck)
    .slice(0, 20);
  return `<div class="room-resolution-table">
    <h4>Room majority outcomes and timing</h4>
    <div class="report-table-scroll"><table><thead><tr>
      <th>MazeMap room</th><th>Runs</th><th>Visits</th><th>Majority inside</th>
      <th>Majority outside</th><th>Unscored</th><th>Caught up</th><th>Transient drift</th><th>Stuck</th>
    </tr></thead><tbody>${rows.map(room => `<tr>
      <th>${esc(room.name || room.poiId || "Unmapped target")}</th>
      <td>${esc(room.runCount)}</td><td>${esc(room.visits)}</td>
      <td>${esc(room.resolved)}</td><td>${esc(room.failures)}</td>
      <td>${esc(room.unscored)}</td><td>${esc(room.settled)}</td>
      <td>${esc(room.drifted ?? 0)}</td><td>${esc(room.stuck)}</td>
    </tr>`).join("") || '<tr><td colspan="9">No room failures.</td></tr>'}
    </tbody></table></div>
  </div>`;
}
function percent(value) {
  return Number.isFinite(value) ? `${Number(value).toFixed(1)}%` : "—";
}
function one(value) {
  return Number.isFinite(value) ? Number(value).toFixed(1) : "—";
}
function seconds(value) {
  return Number.isFinite(value) ? `${Number(value).toFixed(1)} s` : "—";
}
