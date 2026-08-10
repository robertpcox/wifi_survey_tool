// FEATURE:      Report Player floor and route views
// SURFACE:      renderFloorRouteView(result, context)
// WHY TOGETHER: Floor choice, shared MazeMap, labelled fallback, and Player transport occupy one surface.
// STATE:        None
// RULES:        Floor values and display names come only from the result meta block.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { esc } from "../../shared/format.mjs";

const TIMELINESS_PRESETS = Object.freeze([10, 15, 20, 30]);
const ACCURACY_PRESETS = Object.freeze([5, 10, 15, 20, 25]);

export function renderFloorRouteView(result, {
  analysis = null,
  thresholds = analysis?.thresholds ?? { stickySeconds: 15, accuracyM: 10 },
  consolidated = false,
} = {}) {
  const floors = result.meta.zLevels.map(z => ({
    z,
    name: result.meta.zLevelNames[String(z)],
  }));
  return `
    <div class="section-heading map-heading">
      <div><p class="section-kicker">${consolidated ? "Campus surface" : "Route surface"}</p>
        <h2>${consolidated ? "Campus problem map" : "Floor and route"}</h2></div>
      <div class="map-heading-actions">
        <label>Visible floor
          <select data-map-floor>
            ${floors.map(floor => `
              <option value="${esc(floor.z)}">${esc(floor.name)}</option>`).join("")}
          </select>
        </label>
        <div class="map-threshold-controls" role="group" aria-label="Map highlight">
          <label>Highlight
            <select data-map-highlight aria-label="Map highlight">
              ${consolidated
    ? '<option value="freeze" selected>Path sections that froze</option>\n              <option value="sticky">Where Cisco dot stayed held</option>'
    : '<option value="sticky" selected>Time since last update</option>'}
              ${consolidated ? '<option value="lag">Lag behind while walking</option>' : ""}
              <option value="accuracy">Distance off route</option>
              <option value="room">MazeMap area resolution</option>
            </select>
          </label>
          ${thresholdSelect({
            label: "Limit",
            name: "stickySeconds",
            value: thresholds.stickySeconds,
            presets: TIMELINESS_PRESETS,
            unit: "s",
            kind: "sticky",
          })}
          ${thresholdSelect({
            label: "Limit",
            name: "accuracyM",
            value: thresholds.accuracyM,
            presets: ACCURACY_PRESETS,
            unit: "m",
            kind: "accuracy",
            hidden: true,
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
        aria-live="polite" aria-atomic="true"></div>
      <div class="player-transport-slot" data-player-transport hidden></div>
    </div>
    <div class="map-layer-controls" role="group" aria-label="Map overlay">
      ${consolidated ? "" : `<span class="map-concern-legend">
        <i class="fwd" aria-hidden="true"></i> Approach · walking out
        <i class="rev" aria-hidden="true"></i> Approach · walking back
        <i class="dead" aria-hidden="true"></i> Dead centre · locks from both directions
        ${(analysis?.concernSegments ?? []).some(item => item.kind === "rf-suspect")
    ? '<i class="rf" aria-hidden="true"></i> RF suspect · error both ways'
    : ""}
      </span>`}
      ${consolidated ? `<span class="map-stale-legend" data-highlight-legend="freeze">
        <i aria-hidden="true"></i> Walked path freeze · thicker/darker = more seconds
      </span>` : ""}
      <span class="map-stale-legend" data-highlight-legend="sticky"${consolidated ? " hidden" : ""}>
        <i aria-hidden="true"></i> ${consolidated
    ? "Raw Cisco held positions · hotter = more seconds"
    : "No-position-update route segment"}
      </span>
      <span class="map-accuracy-legend" data-highlight-legend="lag" hidden>
        <i aria-hidden="true"></i> Raw Cisco trailing route · hotter = greater metres
      </span>
      <span class="map-accuracy-legend" data-highlight-legend="accuracy" hidden>
        <i aria-hidden="true"></i> ${consolidated
    ? "Error beyond limit · hotter = greater metres"
    : "Position error beyond the selected distance"}
      </span>
      <span class="map-room-legend" data-highlight-legend="room" hidden>
        Whole-area fill:
        <i class="inside" aria-hidden="true"></i> green = all scored samples inside
        <i class="floor" aria-hidden="true"></i> amber = mostly inside, some outside
        <i class="outside" aria-hidden="true"></i> red = half or more outside
        <i class="unknown" aria-hidden="true"></i> grey = unscored
        · solid dot = expected sample · hollow ring = raw Cisco location
        · dashed connector = outside drift from expected to raw Cisco
      </span>
      ${consolidated ? "" : `<span class="map-result-legend">
        <i aria-hidden="true"></i> Wi-Fi result position on its reported floor
      </span>
      <span class="map-warning-legend">
        <i class="truth" aria-hidden="true"></i> Route endpoint
        <i class="reported" aria-hidden="true"></i> Wi-Fi endpoint (floor mismatch)
      </span>`}
    </div>`;
}

function thresholdSelect({
  label,
  name,
  value,
  presets,
  unit,
  kind,
  hidden = false,
}) {
  const selected = Number.isFinite(Number(value)) ? Number(value) : presets[0];
  const options = presets.includes(selected) ? presets : [selected, ...presets];
  const thresholdName = kind === "accuracy"
    ? "Distance off route"
    : "Freeze duration";
  return `<label data-highlight-threshold="${esc(kind)}"${hidden ? " hidden" : ""}>${esc(label)}
    <select data-threshold="${esc(name)}" aria-label="${esc(thresholdName)} threshold">
      ${options.map(option => `<option value="${esc(option)}"${option === selected ? " selected" : ""}>
        ${esc(option)} ${esc(unit)}
      </option>`).join("")}
    </select>
  </label>`;
}
