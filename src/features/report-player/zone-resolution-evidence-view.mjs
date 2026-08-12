// FEATURE:      Zone mismatch evidence
// SURFACE:      renderZoneResolutionEvidence(summary, options)
// WHY TOGETHER: Zone outcome wording and raw Cisco destination evidence form one traceable row.
// STATE:        None
// RULES:        Call another zone wrong-zone; positions outside every zone stay outside mapped zones.
// PROVENANCE:   Zone-only local containment observations

import { esc } from "../../shared/format.mjs";

export function renderZoneResolutionEvidence(summary, { showDevice = true } = {}) {
  const issues = (summary.areaObservations ?? []).filter(item => !item.scored || !item.resolved);
  const rows = issues.slice(0, 80);
  return `<details class="room-resolution-evidence"><summary>
    Zone mismatch evidence (${esc(rows.length)} of ${esc(issues.length)} shown)</summary>
    <div class="report-table-scroll"><table><thead><tr><th>Run</th><th>Checkpoint</th>
      ${showDevice ? "<th>Device</th>" : ""}<th>Zone number / ID</th><th>Expected zone</th>
      <th>Evidence</th><th>Outcome</th><th>Cisco resolved zone</th><th>Distance outside</th>
    </tr></thead><tbody>${rows.map(item => issueRow(item, showDevice)).join("")
      || `<tr><td colspan="${8 + Number(showDevice)}">Every scored zone observation was inside.</td></tr>`}
    </tbody></table></div></details>`;
}

function issueRow(item, showDevice) {
  const moment = item.primary ?? {};
  return `<tr><td><code title="${esc(item.resultId)}">${esc(shortId(item.resultId))}</code></td>
    <th>${esc(item.checkpointId ?? "—")}</th>${showDevice
    ? `<td>${esc(item.device?.name || "Unknown")}</td>` : ""}
    <td>${esc(item.expectedRoom?.identifier || item.expectedRoom?.id || "—")}</td>
    <td>${esc(item.expectedRoom?.name || "Unnamed zone")}</td>
    <td>${item.observationKind === "corridor-point" ? "Walking checkpoint" : "Visit majority"}</td>
    <td>${esc(zoneStatus(item))}</td><td>${esc(observedZone(moment))}</td>
    <td>${esc(distanceLabel(moment))}</td></tr>`;
}

function zoneStatus(item) {
  if (!item.scored) return "Unscored";
  if (item.resolved) return "Inside expected zone";
  return {
    "wrong-room": "Wrong zone",
    unresolved: "Outside mapped zones",
    "wrong-floor": "Wrong floor",
    "no-displayed-fix": "No Cisco fix",
  }[item.primary?.status] ?? "Outside expected zone";
}

function observedZone(moment) {
  if (moment.status === "no-displayed-fix") return "No Cisco fix";
  if (moment.status === "wrong-floor" && !moment.room) return "Different floor";
  const values = [moment.room?.identifier || moment.room?.id, moment.room?.name].filter(Boolean);
  return values.join(" · ") || "Outside mapped zones";
}

function distanceLabel(moment) {
  if (moment.status === "wrong-floor") return "Different floor";
  if (moment.status === "no-displayed-fix") return "No Cisco fix";
  return Number.isFinite(moment.outsideDistanceM) ? `${moment.outsideDistanceM.toFixed(1)} m` : "—";
}

function shortId(value) {
  return String(value ?? "—").slice(0, 8);
}
