// FEATURE:      Report Player floor and route views
// SURFACE:      renderFloorRouteView(result)
// WHY TOGETHER: Floor choice, shared MazeMap, labelled fallback, and Player transport occupy one surface.
// STATE:        None
// RULES:        Floor values and display names come only from the result meta block.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { esc } from "../../shared/format.mjs";

export function renderFloorRouteView(result) {
  const floors = result.meta.zLevels.map(z => ({
    z,
    name: result.meta.zLevelNames[String(z)],
  }));
  return `
    <div class="section-heading map-heading">
      <div><p class="section-kicker">Route surface</p><h2>Floor and route</h2></div>
      <label>Visible floor
        <select data-map-floor>
          ${floors.map(floor => `
            <option value="${esc(floor.z)}">${esc(floor.name)}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="map-stage">
      <div id="report-maze-map" class="maze-map" data-maze-map
        aria-label="MazeMap campus map"></div>
      <div class="map-fallback" data-map-fallback hidden>
        <canvas width="900" height="460" data-report-map aria-label="Route fallback map"></canvas>
        <span><strong>Route fallback</strong> · MazeMap is unavailable</span>
      </div>
      <p class="map-runtime-status" data-map-runtime-status>Loading public campus map…</p>
      <div class="player-transport-slot" data-player-transport hidden></div>
    </div>
    <div class="map-layer-controls" role="group" aria-label="Map overlay">
      <button type="button" data-map-heat="sticky" class="active">Sticky heat</button>
      <button type="button" data-map-heat="accuracy">Accuracy heat</button>
      <button type="button" data-map-heat="none">Route only</button>
      <span class="map-warning-legend">
        <i aria-hidden="true"></i> Floor mismatch at inferred route position
      </span>
    </div>`;
}
