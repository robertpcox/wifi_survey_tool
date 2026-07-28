// FEATURE:      Report heat overlays on the shared geographic map
// SURFACE:      createReportMapLayers(map, currentFloor)
// WHY TOGETHER: Sticky/accuracy extraction, GeoJSON weighting, and heat visibility share one boundary.
// STATE:        Selected report heat kind and two stable GeoJSON sources
// RULES:        Use exact lng/lat/z, elapsed weightSeconds, and the selected meta floor.
// PROVENANCE:   Scope/contracts/report_analysis.md shared-map heat contract

import { createGeoJsonLayerGroup } from "./geojson-layer-group.mjs";

const KINDS = ["sticky", "accuracy"];
const COLORS = [
  "interpolate", ["linear"], ["heatmap-density"],
  0, "rgba(0,0,255,0)",
  0.2, "#1FAFFC",
  0.4, "#5BD76F",
  0.6, "#FFE61E",
  0.8, "#FF7B00",
  1, "#FF3333",
];

export function createReportMapLayers(map, currentFloor) {
  const definitions = KINDS.map(kind => ({
    id: `report-${kind}-heat-lyr`,
    source: `report-${kind}-heat`,
    type: "heatmap",
    paint: heatPaint(),
  }));
  const group = createGeoJsonLayerGroup(map, definitions, currentFloor);
  let selectedKind = "sticky";

  function draw(kind, pointsOrAnalysis) {
    if (!KINDS.includes(kind)) {
      if (kind === "none") return select("none");
      throw new TypeError(`Unknown report heat kind: ${kind}`);
    }
    const points = heatPoints(kind, pointsOrAnalysis);
    group.setData(`report-${kind}-heat`, points.map(heatFeature));
    select(kind);
    return points.length;
  }

  function select(kind) {
    if (![...KINDS, "none"].includes(kind)) {
      throw new TypeError(`Unknown report heat kind: ${kind}`);
    }
    selectedKind = kind;
    group.ensure();
    for (const candidate of KINDS) {
      group.setLayerVisible(
        `report-${candidate}-heat-lyr`,
        candidate === kind,
      );
    }
    return selectedKind;
  }

  function setVisible(visible) {
    if (!visible) return group.setVisible(false);
    select(selectedKind);
  }

  return Object.freeze({
    applyFloor: group.applyFloor,
    draw,
    ensure: group.ensure,
    select,
    setVisible,
    get selectedKind() { return selectedKind; },
    get sourceIds() { return group.sourceIds; },
  });
}

function heatPoints(kind, input) {
  if (Array.isArray(input) && input.every(item => !Array.isArray(item?.points))) {
    return input;
  }
  const source = input?.heatmaps?.[kind]
    ?? input?.[kind]?.heatByZ
    ?? input?.[kind]
    ?? input;
  if (source instanceof Map) {
    return [...source.values()].flatMap(bucket => bucket?.points ?? bucket ?? []);
  }
  if (Array.isArray(source)) {
    return source.flatMap(bucket => bucket?.points ?? bucket ?? []);
  }
  if (source && typeof source === "object") {
    return Object.values(source).flatMap(bucket => bucket?.points ?? bucket ?? []);
  }
  return [];
}

function heatFeature(point) {
  const lng = Number(point?.lng);
  const lat = Number(point?.lat);
  const z = Number(point?.z);
  const weightSeconds = Number(point?.weightSeconds ?? point?.weight);
  if (![lng, lat, z, weightSeconds].every(Number.isFinite)) {
    throw new TypeError("Report heat points require finite lng, lat, z, and weightSeconds.");
  }
  return {
    type: "Feature",
    properties: { ...point, z, weightSeconds },
    geometry: { type: "Point", coordinates: [lng, lat] },
  };
}

function heatPaint() {
  return {
    "heatmap-weight": ["get", "weightSeconds"],
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 16, 0.2, 22, 1],
    "heatmap-color": COLORS,
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 5, 22, 30],
    "heatmap-opacity": 0.8,
  };
}
