// FEATURE:      Report issue summaries
// SURFACE:      renderReportSummary(insights, thresholds)
// WHY TOGETHER: Floor totals, ranked route zones, and floor-lag episodes answer where issues happened.
// STATE:        None
// RULES:        Rank elapsed moving evidence and keep duplicate stop names separated by route identity.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import { esc } from "../../shared/format.mjs";

export function renderReportSummary(insights, thresholds) {
  return `
    <div class="insight-divider"></div>
    <div class="section-heading">
      <div>
        <p class="section-kicker">Location intelligence</p>
        <h2>Where position updates get stuck</h2>
      </div>
      <p>More than ${esc(formatThreshold(thresholds.stickySeconds, "s"))};
        planned dwell excluded.</p>
    </div>
    <div class="issue-summary-grid">
      ${floorCard(insights.byFloor)}
      ${zoneCard(insights.zones)}
    </div>
    ${floorLag(insights.floorEpisodes)}`;
}

function floorCard(floors) {
  const max = Math.max(1, ...floors.map(floor => floor.affectedSeconds));
  return `<article class="issue-summary-card">
    <h3>No-update time by floor</h3>
    <p>Elapsed time after the selected limit, while route truth was moving.</p>
    <div class="issue-bars">
      ${floors.map(floor => `<div class="issue-bar-row">
        <span>${esc(floor.name)}</span>
        <i style="--issue-width:${percent(floor.affectedSeconds, max)}%"></i>
        <strong>${esc(duration(floor.affectedSeconds))}</strong>
        <small>${esc(floor.episodeCount)} episodes · p95 error
          ${esc(distance(floor.p95AccuracyM))}</small>
      </div>`).join("")}
    </div>
  </article>`;
}

function zoneCard(zones) {
  const max = Math.max(1, ...zones.map(zone => zone.affectedSeconds));
  const rows = zones.length
    ? zones.map(zone => `<div class="issue-bar-row" data-zone-id="${esc(zone.id)}">
        <span>${esc(zone.name)} · ${esc(routePosition(zone.routeDistanceM))}</span>
        <i style="--issue-width:${percent(zone.affectedSeconds, max)}%"></i>
        <strong>${esc(duration(zone.affectedSeconds))}</strong>
        <small>${esc(zone.sampleCount)} supporting polls · z ${esc(zone.z)}</small>
      </div>`).join("")
    : `<p>No moving no-update location exceeded the selected limit.</p>`;
  return `<article class="issue-summary-card">
    <h3>Top no-update locations</h3>
    <p>Nearest immutable route stop; repeated names remain separate route positions.</p>
    <div class="issue-bars">${rows}</div>
  </article>`;
}

function floorLag(episodes) {
  const rows = episodes.length
    ? episodes.map(episode => `<tr>
        <td>${esc(clock(episode.elapsedSeconds))}</td>
        <td>${esc(duration(episode.affectedSeconds))}</td>
        <td>${esc(episode.reportedFloor)}</td>
        <td>${esc(episode.actualFloor)}</td>
        <td>${esc(episode.near)}</td>
      </tr>`).join("")
    : `<tr><td colspan="5">No floor-level disconnect was recorded.</td></tr>`;
  const total = episodes.reduce((sum, episode) => sum + episode.affectedSeconds, 0);
  return `<div class="floor-lag">
    <div class="section-heading">
      <div>
        <p class="section-kicker">Floor tracking</p>
        <h2>Floor changes lag behind</h2>
      </div>
      <p>${esc(episodes.length)} episodes · ${esc(duration(total))}</p>
    </div>
    <div class="report-table-scroll">
      <table>
        <thead><tr>
          <th>When</th><th>Duration</th><th>Reported floor</th>
          <th>Route floor</th><th>Where</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </div>`;
}

function duration(seconds) {
  if (!Number.isFinite(seconds)) return "—";
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${Math.round(seconds % 60)}s`;
  }
  return `${seconds.toFixed(1)}s`;
}

function distance(metres) {
  return Number.isFinite(metres) ? `${metres.toFixed(1)} m` : "—";
}

function routePosition(metres) {
  if (!Number.isFinite(metres)) return "route";
  return metres >= 1000 ? `${(metres / 1000).toFixed(2)} km` : `${Math.round(metres)} m`;
}

function clock(seconds) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(Math.round(seconds % 60)).padStart(2, "0")}`;
}

function formatThreshold(value, unit) {
  return `${Number.isInteger(value) ? value : Number(value).toFixed(1)} ${unit}`;
}

function percent(value, max) {
  return Math.max(2, Math.round(value / max * 1000) / 10);
}
