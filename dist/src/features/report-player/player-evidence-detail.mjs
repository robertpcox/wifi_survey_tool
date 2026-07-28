// FEATURE:      Full-screen Report Player
// SURFACE:      Evidence markup and state-label helpers for the Player rail
// WHY TOGETHER: Poll-pair, capture, freshness, and snap labels all describe one selected moment.
// STATE:        None
// RULES:        Route locations are labelled estimates and raw evidence is escaped or text-only.
// PROVENANCE:   Scope/steps/05a_recast_player.md and Scope/contracts/report_analysis.md

import { esc } from "../../shared/format.mjs";

export function playerEvidenceItems(frame) {
  const evidence = frame.pollEvidence ?? {};
  return [
    ...(evidence.failures ?? []),
    ...(evidence.outcomes ?? []),
    ...(evidence.unlocated ?? []),
  ];
}

export function pairPickerMarkup(frame, selectedPollId) {
  const items = playerEvidenceItems(frame);
  if (!items.length) {
    return '<span class="empty-state">No completed capture outcomes yet.</span>';
  }
  return items.map(item => {
    const id = item.pollId ?? item.poll?.id ?? item.id;
    const failed = item.kind === "failure"
      || item.success === false
      || item.poll?.success === false;
    return `<button type="button" data-player-pair="${esc(id)}"
      class="${id === selectedPollId ? "active" : ""} ${failed ? "failure" : ""}">
      ${esc(id)}<span>${failed ? "failed" : "paired"}</span></button>`;
  }).join("");
}

export function pairMarkup(item) {
  if (!item) return "No completed poll at this moment.";
  const poll = item.poll ?? item;
  const sentTruth = item.sentTruth ?? item.routeSend;
  const receivedTruth = item.receivedTruth ?? item.routeReceive;
  const fix = poll.normalized ?? item.rawFix;
  const rows = [
    ["Poll", poll.id ?? item.pollId],
    ["Outcome", poll.success === false ? poll.error ?? "Failed" : "Usable response"],
    ["Sent", timing(poll.sentAt, sentTruth)],
    ["Received", timing(poll.receivedAt, receivedTruth)],
    ["HTTP / RTT", `${poll.httpStatus ?? "—"} / ${poll.roundTripMs ?? "—"} ms`],
    ["Returned fix", fix ? `${fix.lng}, ${fix.lat} · z ${fix.z}` : "No usable fix"],
    ["Fix time", fix?.fixTime ?? "Unavailable"],
    ["Identity", item.identityChanged === false ? "Unchanged" : "Changed"],
    ["Coordinates", item.coordinatesMoved === false ? "Same position" : "Moved"],
  ];
  return `<dl>${rows.map(([term, value]) => (
    `<div><dt>${term}</dt><dd>${esc(value ?? "—")}</dd></div>`
  )).join("")}</dl>`;
}

export function requestState(frame, poll) {
  const inFlight = frame.pollEvidence?.inFlight ?? [];
  if (inFlight.length) return `${inFlight.length} in flight`;
  if (!poll) return "Waiting";
  return poll.success === false ? "Failed" : "Complete";
}

export function stateLabel({ fix, fixAge, floorMatch, poll }) {
  if (poll?.success === false) return "Poll failed";
  if (!fix) return "Waiting for fix";
  if (floorMatch === false) return "Wrong floor";
  if (fixAge != null && fixAge >= 30) return "Frozen";
  if (fixAge != null && fixAge >= 15) return "Stale";
  return "Current";
}

export function captureMarkup(frame) {
  const checkIn = frame.checkIns?.at(-1);
  const event = frame.events?.at(-1);
  if (!checkIn && !event) return "No check-in or capture event at this moment.";
  return `<dl>
    <div><dt>Checkpoint</dt><dd>${esc(checkIn?.checkpointId ?? "—")}</dd></div>
    <div><dt>Dwell</dt><dd>${frame.walker?.plannedDwell ? "Planned dwell" : "Moving"}</dd></div>
    <div><dt>Latest event</dt><dd>${esc(event?.type ?? "—")}</dd></div>
  </dl>`;
}

export function rawEvidence(item, latest) {
  const raw = item?.poll?.raw ?? item?.raw ?? latest?.poll?.raw ?? latest?.raw;
  return raw ? JSON.stringify(raw, null, 2) : "No usable capture fix yet.";
}

export function snapLabel(snap) {
  if (!snap) return "Snap tester off.";
  if (!snap.candidate) {
    return "Rejected · no same-floor candidate in the active route interval.";
  }
  const rawDistance = snap.distanceM ?? snap.measuredDistanceM;
  const distance = Number.isFinite(rawDistance) ? rawDistance : null;
  const label = distance == null ? "distance unavailable" : `${distance.toFixed(1)} m`;
  return `${snap.accepted ? "Accepted" : "Rejected"} · ${label} from raw fix `
    + `(radius ${snap.radiusM} m).`;
}

function timing(value, truth) {
  const estimate = truth
    ? ` · route estimate ${truth.lng.toFixed(6)}, ${truth.lat.toFixed(6)} z ${truth.z}`
    : " · route estimate unavailable";
  return `${value ?? "—"}${estimate}`;
}
