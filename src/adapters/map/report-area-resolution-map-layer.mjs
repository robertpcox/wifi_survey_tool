// FEATURE:      MazeMap area-resolution map evidence
// SURFACE:      createReportAreaResolutionMapLayer(map, currentFloor)
// WHY TOGETHER: Majority area fills and one representative raw Cisco fix form one overlay.
// STATE:        Four stable GeoJSON sources filtered by displayed floor
// RULES:        Polygon verdict is primary; never expand transient catch-up states into failures.
// PROVENANCE:   Dynamic room and long-corridor area resolution

import { createGeoJsonLayerGroup } from "./geojson-layer-group.mjs";
import { areaObservationFeatures }
  from "./report-area-observation-features.mjs";
import { areaPolygonFeatures } from "./report-area-polygon-features.mjs";

const DEFINITIONS = [{
  id: "report-area-resolution-area-lyr",
  source: "report-area-resolution-area",
  type: "fill",
  paint: {
    "fill-color": ["match", ["get", "severity"],
      "good", "#16a34a", "mixed", "#f59e0b",
      "bad", "#dc2626", "#64748b"],
    "fill-opacity": ["match", ["get", "severity"],
      "good", 0.14, "mixed", 0.28, "bad", 0.36, 0.14],
    "fill-outline-color": ["match", ["get", "severity"],
      "good", "#15803d", "mixed", "#b45309",
      "bad", "#991b1b", "#475569"],
  },
}, {
  id: "report-area-resolution-truth-lyr",
  source: "report-area-resolution-truth",
  type: "circle",
  paint: {
    "circle-color": ["match", ["get", "verdict"],
      "inside", "#16a34a", "outside", "#dc2626",
      "wrong-floor", "#f97316", "no-position", "#64748b", "#94a3b8"],
    "circle-radius": ["match", ["get", "verdict"], "inside", 2.5, 4],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 1.5,
    "circle-opacity": 0.55,
  },
}, {
  id: "report-area-resolution-drift-lyr",
  source: "report-area-resolution-drift",
  type: "line",
  paint: {
    "line-color": "#dc2626",
    "line-width": 1.5,
    "line-opacity": 0.3,
    "line-dasharray": [2, 2],
  },
}, {
  id: "report-area-resolution-cisco-lyr",
  source: "report-area-resolution-cisco",
  type: "circle",
  paint: {
    "circle-color": "#ffffff",
    "circle-radius": 4,
    "circle-stroke-color": ["match", ["get", "verdict"],
      "inside", "#16a34a", "outside", "#dc2626",
      "wrong-floor", "#f97316", "no-position", "#64748b", "#94a3b8"],
    "circle-stroke-width": 2,
    "circle-opacity": 0.82,
  },
}];
export function createReportAreaResolutionMapLayer(map, currentFloor) {
  const group = createGeoJsonLayerGroup(map, DEFINITIONS, currentFloor);

  function draw(summary) {
    const observations = summary?.areaObservations ?? [];
    const features = observations.map(areaObservationFeatures);
    group.setData(DEFINITIONS[0].source, areaPolygonFeatures(summary?.areaPolygons));
    group.setData(DEFINITIONS[1].source, features.map(item => item.truth));
    group.setData(DEFINITIONS[2].source, features.flatMap(item => item.line ?? []));
    group.setData(DEFINITIONS[3].source, features.flatMap(item => item.cisco ?? []));
    return observations.length;
  }
  return Object.freeze({
    applyFloor: group.applyFloor,
    draw,
    ensure: group.ensure,
    setVisible: group.setVisible,
    get sourceIds() { return group.sourceIds; },
  });
}
