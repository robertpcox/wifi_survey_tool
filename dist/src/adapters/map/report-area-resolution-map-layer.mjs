// FEATURE:      MazeMap area-resolution map evidence
// SURFACE:      createReportAreaResolutionMapLayer(map, currentFloor)
// WHY TOGETHER: Scored-area fills and failed expected-versus-Cisco pairs form one overlay.
// STATE:        Four stable GeoJSON sources filtered by displayed floor
// RULES:        Draw only displayed raw fixes outside truth; keep all evidence in report scores.
// PROVENANCE:   Dynamic room and long-corridor area resolution

import { createGeoJsonLayerGroup } from "./geojson-layer-group.mjs";
import { areaObservationFeatures, isDisplayedAreaFailure }
  from "./report-area-observation-features.mjs";
import { areaPolygonFeatures } from "./report-area-polygon-features.mjs";

const DEFINITIONS = [{
  id: "report-area-resolution-area-lyr",
  source: "report-area-resolution-area",
  type: "fill",
  paint: {
    "fill-color": resolutionColour(
      "#b91c1c", "#d97706", "#15803d", "#64748b",
    ),
    "fill-opacity": ["case", ["boolean", ["get", "scored"], false], 0.5, 0.18],
    "fill-outline-color": resolutionColour(
      "#7f1d1d", "#92400e", "#166534", "#475569",
    ),
  },
}, {
  id: "report-area-resolution-truth-lyr",
  source: "report-area-resolution-truth",
  type: "circle",
  paint: {
    "circle-color": "#f59e0b",
    "circle-radius": 4,
    "circle-stroke-color": verdictColour(),
    "circle-stroke-width": 2,
    "circle-opacity": 0.92,
  },
}, {
  id: "report-area-resolution-drift-lyr",
  source: "report-area-resolution-drift",
  type: "line",
  paint: {
    "line-color": "#2563eb",
    "line-width": 1.5,
    "line-opacity": 0.48,
    "line-dasharray": [2, 2],
  },
}, {
  id: "report-area-resolution-cisco-lyr",
  source: "report-area-resolution-cisco",
  type: "circle",
  paint: {
    "circle-color": "#2563eb",
    "circle-radius": 4.5,
    "circle-stroke-color": verdictColour(),
    "circle-stroke-width": 2,
    "circle-opacity": 0.95,
  },
}];

function resolutionColour(red, amber, green, unscored) {
  return ["case",
    ["boolean", ["get", "scored"], false],
    ["interpolate", ["linear"],
      ["to-number", ["get", "resolutionPercent"], 0],
      0, red, 50, amber, 100, green],
    unscored];
}

function verdictColour() {
  return ["match", ["get", "verdict"],
    "inside", "#16a34a", "outside", "#dc2626",
    "wrong-floor", "#f97316", "no-position", "#64748b", "#94a3b8"];
}

export function createReportAreaResolutionMapLayer(map, currentFloor) {
  const group = createGeoJsonLayerGroup(map, DEFINITIONS, currentFloor);

  function draw(summary) {
    const observations = summary?.areaObservations ?? [];
    const features = observations.filter(isDisplayedAreaFailure)
      .map(areaObservationFeatures);
    group.setData(DEFINITIONS[0].source, areaPolygonFeatures(summary?.areaPolygons));
    group.setData(DEFINITIONS[1].source, features.map(item => item.truth));
    group.setData(DEFINITIONS[2].source, features.flatMap(item => item.line ?? []));
    group.setData(DEFINITIONS[3].source, features.flatMap(item => item.cisco ?? []));
    return features.length;
  }
  return Object.freeze({
    applyFloor: group.applyFloor,
    draw,
    ensure: group.ensure,
    setVisible: group.setVisible,
    get sourceIds() { return group.sourceIds; },
  });
}
