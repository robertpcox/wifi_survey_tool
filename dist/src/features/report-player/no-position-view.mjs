// FEATURE:      Report effective-availability view
// SURFACE:      renderNoPositionView({ result, analysis })
// WHY TOGETHER: Dropout headline and located episode list present one coverage story.
// STATE:        None
// RULES:        HTTP success never hides a stale served fix; episodes name where coverage dropped.
// PROVENANCE:   NDH availability lane · provider always 200s with the last-ever fix

import { esc } from "../../shared/format.mjs";

export function renderNoPositionView({ result, analysis }) {
  const { noPosition } = analysis.fixes;
  const floorNames = new Map(
    analysis.floors.map(floor => [String(floor.z), floor.name]),
  );
  const startedMs = Date.parse(result.run.startedAt);
  return `
    <div class="section-heading">
      <div>
        <p class="section-kicker">Availability</p>
        <h2>Where coverage effectively dropped out</h2>
      </div>
      <p>${esc(noPosition.episodes.length)} episodes ·
        ${esc(seconds(noPosition.totalSeconds))} (${esc(noPosition.percent)}% of the run)</p>
    </div>
    <p class="diagnostic-intro">
      Every poll answered HTTP 200, so failures alone hide outages. This counts time
      where the poll failed or the served fix was older than
      ${esc(noPosition.thresholdSeconds)} s — effectively no position.
    </p>
    ${noPosition.episodes.length ? episodeTable(noPosition, floorNames, startedMs) : `
      <p class="request-summary is-clear">The served position never went effectively
        missing for more than ${esc(noPosition.thresholdSeconds)} s.</p>`}`;
}

function episodeTable(noPosition, floorNames, startedMs) {
  const rows = noPosition.episodes.map(episode => `<tr>
      <td>${esc(clock((Date.parse(episode.startedAt) - startedMs) / 1000))}</td>
      <td>${esc(seconds(episode.durationSeconds))}</td>
      <td>${esc(floorNames.get(String(episode.z)) ?? "Outside route truth")}</td>
      <td>${esc(routePosition(episode.routeDistanceM))}</td>
    </tr>`).join("");
  return `<div class="report-table-scroll">
    <table>
      <thead><tr>
        <th>Into run</th><th>Duration</th><th>Floor</th><th>Route position</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function clock(value) {
  if (!Number.isFinite(value)) return "—";
  const minutes = Math.floor(value / 60);
  return `${minutes}:${String(Math.round(value % 60)).padStart(2, "0")}`;
}

function seconds(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} s` : "—";
}

function routePosition(metres) {
  return Number.isFinite(metres) ? `${Math.round(metres)} m along route` : "—";
}
