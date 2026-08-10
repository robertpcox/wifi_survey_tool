// FEATURE:      Room-resolution evidence detail
// SURFACE:      renderRoomResolutionEvidence(summary)
// WHY TOGETHER: Traceable run/time identity and dwell outcome labels share one evidence table.
// STATE:        None
// RULES:        Show the raw primary Cisco state; disclose truncation explicitly.
// PROVENANCE:   Consolidated dynamic room report

import { esc } from "../../shared/format.mjs";

export function renderRoomResolutionEvidence(summary) {
  const issues = summary.observations.filter(item => (
    !item.resolved || item.dwellFailureMomentCount > 0
  ));
  const rows = issues.slice(0, 80);
  return `<details class="room-resolution-evidence"><summary>
    Room evidence (${esc(rows.length)} of ${esc(issues.length)} shown)</summary>
    <div class="report-table-scroll"><table><thead><tr>
      <th>Run</th><th>Time</th><th>Checkpoint</th><th>Device</th>
      <th>MazeMap truth</th><th>Cisco blue dot</th><th>Outcome</th><th>Fix age</th>
    </tr></thead><tbody>${rows.map(item => `<tr>
      <td><code title="${esc(item.resultId)}">${esc(shortId(item.resultId))}</code></td>
      <td>${esc(clock(item.checkedInAt))}</td><th>${esc(item.checkpointId)}</th>
      <td>${esc(item.device?.name || "Unknown")}</td>
      <td>${esc(item.expectedRoom?.name || item.roomLabel)}</td>
      <td>${esc(item.primary.room?.name || positionLabel(item.primary))}</td>
      <td>${esc(statusLabel(item))}</td><td>${esc(ageLabel(item.primary.ageSeconds))}</td>
    </tr>`).join("") || '<tr><td colspan="8">No issue evidence.</td></tr>'}
    </tbody></table></div></details>`;
}

function statusLabel(item) {
  const dwell = {
    "resolved-during-dwell": "Settled during dwell",
    "lost-resolution": "Lost resolution during dwell",
    "intermittent-resolution": "Drifted out during dwell",
    "temporary-resolution": "Resolved only temporarily",
  }[item.settleState];
  return dwell ?? item.primary.status.replaceAll("-", " ");
}

function positionLabel(moment) {
  return moment.point
    ? `${moment.point.lat.toFixed(5)}, ${moment.point.lng.toFixed(5)}` : "No position";
}

function ageLabel(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} s` : "—";
}

function shortId(value) {
  return String(value ?? "—").slice(0, 8);
}

function clock(value) {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(11, 19) : "—";
}
