// FEATURE:      Creator dwell schedule
// SURFACE:      Per-leg check-in markup and dwell input reading
// WHY TOGETHER: Rendered checkpoint identity must match the value read by controller actions.
// STATE:        Current rendered route
// RULES:        Start is omitted; terminal is manual; other arrivals expose timed dwell.
// PROVENANCE:   Scope/steps/03_build_creator.md

import { checkpointDwellSeconds } from "../../domain/checkpoint-dwell-v3.mjs";

export function renderCreatorDwellSchedule(find, stops, route) {
  const stopNames = new Map(stops.map(stop => [stop.id, stop.name]));
  const checkpoints = route.checkpoints ?? [];
  find("[data-leg-list]").innerHTML = (route.legs ?? []).map((leg, index) => {
    const legCheckpoints = checkpoints.filter(checkpoint => (
      checkpoint.legId === leg.id
      || (
        checkpoint.type === "stop"
        && checkpoint.stopId === leg.toStopId
      )
    )).sort((left, right) => left.sequence - right.sequence);
    const intermediateCount = { value: 0 };
    return `
      <section class="creator-leg-card">
        <h3>Leg ${index + 1}
          <small>${escapeText(stopNames.get(leg.fromStopId) ?? leg.fromStopId)}
            → ${escapeText(stopNames.get(leg.toStopId) ?? leg.toStopId)}</small>
        </h3>
        <ul>${legCheckpoints.map(checkpoint => checkpointRow(
          checkpoint,
          stopNames,
          intermediateCount,
          route.legacyDwellSeconds,
          checkpoints.at(-1)?.sequence,
        )).join("")}</ul>
      </section>
    `;
  }).join("");
}

export function readCreatorCheckpointDwell(root, sequence) {
  const input = root.querySelector(
    `[data-checkpoint-dwell="${Number(sequence)}"]`,
  );
  if (!input) throw new TypeError(`checkpoint ${Number(sequence) + 1}: dwell input is missing`);
  return input.value;
}

function checkpointRow(
  checkpoint,
  stopNames,
  intermediateCount,
  legacyDwell,
  terminalSequence,
) {
  const intermediate = checkpoint.type === "intermediate";
  if (intermediate) intermediateCount.value++;
  const label = intermediate
    ? `Check-in ${intermediateCount.value} · mid-leg`
    : `Leg end · ${stopNames.get(checkpoint.stopId) ?? checkpoint.stopId}`;
  if (checkpoint.sequence === terminalSequence) {
    return `<li class="creator-terminal"><span>Session end · `
      + `${escapeText(stopNames.get(checkpoint.stopId) ?? checkpoint.stopId)}</span>`
      + `<strong>Runner keeps polling until the operator finishes.</strong></li>`;
  }
  const dwell = checkpointDwellSeconds(checkpoint, legacyDwell ?? 0);
  return `
    <li>
      <span>${escapeText(label)}</span>
      <label>Dwell
        <input data-checkpoint-dwell="${checkpoint.sequence}" type="number"
          min="0" value="${dwell}" aria-label="${escapeText(label)} dwell seconds">
        <small>seconds</small>
      </label>
      <button type="button" data-action="save-checkpoint-dwell"
        data-sequence="${checkpoint.sequence}">Save</button>
      <button type="button" data-action="clear-checkpoint-dwell"
        data-sequence="${checkpoint.sequence}"${dwell === 0 ? " disabled" : ""}>Move on</button>
    </li>
  `;
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
