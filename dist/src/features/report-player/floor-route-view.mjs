// FEATURE:      Report Player floor and route views
// SURFACE:      renderFloorRouteView(result)
// WHY TOGETHER: Floor choice and the one shared public/private map surface form one report section.
// STATE:        None
// RULES:        Floor values and display names come only from the result meta block.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { esc } from "../../shared/format.mjs";

export function renderFloorRouteView(result) {
  const floors = result.meta.zLevels.map(z => ({
    z,
    name: result.meta.zLevelNames[String(z)],
  }));
  return `
    <div class="section-heading">
      <div><p class="section-kicker">Route surface</p><h2>Floor and route</h2></div>
      <label>Visible floor
        <select data-map-floor>
          ${floors.map(floor => `
            <option value="${esc(floor.z)}">${esc(floor.name)}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="map-stage">
      <div class="public-map" data-public-map>
        <canvas width="900" height="460" data-report-map aria-label="Public route map"></canvas>
        <span>Public route map · embedded overlays</span>
      </div>
      <div id="report-private-map" class="private-map" data-private-map hidden></div>
    </div>
    <div class="map-layer-controls" role="group" aria-label="Map overlay">
      <button type="button" data-map-heat="sticky" class="active">Sticky heat</button>
      <button type="button" data-map-heat="accuracy">Accuracy heat</button>
      <button type="button" data-map-heat="none">Route only</button>
    </div>`;
}
