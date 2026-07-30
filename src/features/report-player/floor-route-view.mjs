// FEATURE:      Report Player floor and route views
// SURFACE:      renderFloorRouteView(result, context)
// WHY TOGETHER: Floor choice, shared MazeMap, labelled fallback, and Player transport occupy one surface.
// STATE:        None
// RULES:        Floor values and display names come only from the result meta block.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { esc } from "../../shared/format.mjs";
import { renderAnalysisMapAlerts } from "./map-alert-view.mjs";

const TIMELINESS_PRESETS = Object.freeze([10, 15, 20, 30]);
const ACCURACY_PRESETS = Object.freeze([5, 10, 15, 20, 25]);

export function renderFloorRouteView(result, {
  analysis = null,
  thresholds = analysis?.thresholds ?? { stickySeconds: 15, accuracyM: 10 },
} = {}) {
  const floors = result.meta.zLevels.map(z => ({
    z,
    name: result.meta.zLevelNames[String(z)],
  }));
  return `
    <div class="section-heading map-heading">
      <div><p class="section-kicker">Route surface</p><h2>Floor and route</h2></div>
      <div class="map-heading-actions">
        <label>Visible floor
          <select data-map-floor>
            ${floors.map(floor => `
              <option value="${esc(floor.z)}">${esc(floor.name)}</option>`).join("")}
          </select>
        </label>
        <div class="map-threshold-controls" role="group" aria-label="Heat thresholds">
          ${thresholdSelect({
            label: "Timeliness",
            name: "stickySeconds",
            value: thresholds.stickySeconds,
            presets: TIMELINESS_PRESETS,
            unit: "s",
          })}
          ${thresholdSelect({
            label: "Accuracy",
            name: "accuracyM",
            value: thresholds.accuracyM,
            presets: ACCURACY_PRESETS,
            unit: "m",
          })}
        </div>
      </div>
    </div>
    <div class="map-stage">
      <div id="report-maze-map" class="maze-map" data-maze-map
        aria-label="MazeMap campus map"></div>
      <div class="map-fallback" data-map-fallback hidden>
        <canvas width="900" height="460" data-report-map aria-label="Route fallback map"></canvas>
        <span><strong>Route fallback</strong> · MazeMap is unavailable</span>
      </div>
      <p class="map-runtime-status" data-map-runtime-status>Loading public campus map…</p>
      <div class="map-alert-stack" data-module="mapAlerts" role="status"
        aria-live="polite" aria-atomic="true">
        ${renderAnalysisMapAlerts(analysis)}
      </div>
      <div class="player-transport-slot" data-player-transport hidden></div>
    </div>
    <div class="map-layer-controls" role="group" aria-label="Map overlay">
      <button type="button" data-map-heat="sticky" class="active">No-position-update heat</button>
      <button type="button" data-map-heat="accuracy">Accuracy heat</button>
      <button type="button" data-map-heat="none">No heat</button>
      <span class="map-stale-legend">
        <i aria-hidden="true"></i> No-position-update route segment
      </span>
      <span class="map-result-legend">
        <i aria-hidden="true"></i> Wi-Fi result position on its reported floor
      </span>
      <span class="map-warning-legend">
        <i class="truth" aria-hidden="true"></i> Route endpoint
        <i class="reported" aria-hidden="true"></i> Wi-Fi endpoint (floor mismatch)
      </span>
    </div>`;
}

function thresholdSelect({ label, name, value, presets, unit }) {
  const selected = Number.isFinite(Number(value)) ? Number(value) : presets[0];
  const options = presets.includes(selected) ? presets : [selected, ...presets];
  return `<label>${esc(label)}
    <select data-threshold="${esc(name)}" aria-label="${esc(label)} threshold">
      ${options.map(option => `<option value="${esc(option)}"${option === selected ? " selected" : ""}>
        ${esc(option)} ${esc(unit)}
      </option>`).join("")}
    </select>
  </label>`;
}
