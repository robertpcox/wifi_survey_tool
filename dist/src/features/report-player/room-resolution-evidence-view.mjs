// FEATURE:      Room-resolution evidence detail
// SURFACE:      renderRoomResolutionEvidence(summary)
// WHY TOGETHER: Traceable visit verdict and end-window raw Cisco evidence share one table.
// STATE:        None
// RULES:        One row per visit; catch-up samples never expand into independent failures.
// PROVENANCE:   Consolidated dynamic room report

import { esc } from "../../shared/format.mjs";

export function renderRoomResolutionEvidence(summary, { showDevice = true } = {}) {
  const issues = summary.observations.filter(item => (
    !item.resolved || item.dwellFailureMomentCount > 0
  ));
  const rows = issues.slice(0, 80);
  return `<details class="room-resolution-evidence"><summary>
    Room visit evidence (${esc(rows.length)} of ${esc(issues.length)} shown)</summary>
    <div class="report-table-scroll"><table><thead><tr>
      <th>Run</th><th>Time</th><th>Checkpoint</th>
      ${showDevice ? "<th>Device</th>" : ""}<th>Room number / ID</th>
      <th>Expected room / area</th><th>Visit majority</th><th>Cisco resolved area</th>
      <th>Distance outside</th><th>Timing</th><th>Evidence window</th><th>Fix age</th>
    </tr></thead><tbody>${rows.map(item => `<tr>
      <td><code title="${esc(item.resultId)}">${esc(shortId(item.resultId))}</code></td>
      <td>${esc(clock(item.checkedInAt))}</td><th>${esc(item.checkpointId)}</th>
      ${showDevice ? `<td>${esc(item.device?.name || "Unknown")}</td>` : ""}
      <td>${esc(item.expectedRoom?.identifier || item.expectedRoom?.id || "—")}</td>
      <td>${esc(item.expectedRoom?.name || item.roomLabel)}</td>
      <td>${esc(verdictLabel(item))}</td>
      <td>${esc(observedArea(endpoint(item)))}</td>
      <td>${esc(distanceLabel(endpoint(item)))}</td>
      <td>${esc(statusLabel(item))}</td><td>${esc(windowLabel(item))}</td>
      <td>${esc(ageLabel(endpoint(item).ageSeconds))}</td>
    </tr>`).join("") || `<tr><td colspan="${11 + Number(showDevice)}">No issue evidence.</td></tr>`}
    </tbody></table></div></details>`;
}

function endpoint(item) {
  return Object.hasOwn(item, "windowExit") ? (item.windowExit ?? {}) : item.primary;
}

function verdictLabel(item) {
  if (!item.scored) return "Unscored";
  if (item.tied) return "Exact split";
  return item.resolved ? "Majority inside" : "Majority outside";
}

function windowLabel(item) {
  if (!Number.isFinite(item.windowSeconds)) return "—";
  const coverage = item.windowComplete ? "complete" : "available";
  if (![item.insideEvidenceSeconds, item.outsideEvidenceSeconds].every(Number.isFinite)) {
    return `${item.windowSeconds.toFixed(1)} s ${coverage}`;
  }
  return `${item.insideEvidenceSeconds.toFixed(1)} s in · `
    + `${item.outsideEvidenceSeconds.toFixed(1)} s out (${coverage})`;
}

function statusLabel(item) {
  const dwell = {
    "resolved-during-dwell": "Caught up within 20 s",
    "lost-resolution": "Outside at end after resolving",
    "intermittent-resolution": "Transient drift during window",
    "temporary-resolution": "Resolved only temporarily",
  }[item.settleState];
  return dwell ?? item.primary.status.replaceAll("-", " ");
}

function positionLabel(moment) {
  return moment.point
    ? `${moment.point.lat.toFixed(5)}, ${moment.point.lng.toFixed(5)}` : "No position";
}

function observedArea(moment) {
  const room = moment?.room;
  const number = room?.identifier || room?.id;
  const values = [...new Set([number, room?.name].filter(Boolean))];
  return values.join(" · ") || positionLabel(moment);
}

function ageLabel(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} s` : "—";
}

function distanceLabel(moment) {
  if (moment?.status === "wrong-floor") return "Different floor";
  if (moment?.status === "no-displayed-fix") return "No Cisco fix";
  return Number.isFinite(moment?.outsideDistanceM)
    ? `${moment.outsideDistanceM.toFixed(1)} m` : "—";
}

function shortId(value) {
  return String(value ?? "—").slice(0, 8);
}

function clock(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(11, 19) : "—";
}
