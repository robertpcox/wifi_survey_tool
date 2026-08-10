// FEATURE:      Report no-position-update walked-path overlay
// SURFACE:      createReportStalePathMapLayer(map, currentFloor)
// WHY TOGETHER: Exact stale route slices, native-floor filtering, and visibility form one overlay.
// STATE:        One stable GeoJSON source and line layer
// RULES:        Geometry stays on ground truth; never join legs, floors, or threshold gaps.
// PROVENANCE:   NDH field-report "where it gets stuck" feedback

import { createGeoJsonLayerGroup } from "./geojson-layer-group.mjs";

const DEFINITION = {
  id: "report-stale-path-lyr",
  source: "report-stale-path",
  type: "line",
  layout: {
    "line-cap": "round",
    "line-join": "round",
  },
  paint: {
    "line-color": [
      "interpolate", ["linear"], freezeWeight(),
      0, "#f59e0b",
      15, "#f97316",
      60, "#dc2626",
    ],
    "line-opacity": [
      "interpolate", ["linear"], freezeWeight(),
      0, 0.55,
      15, 0.72,
      60, 0.9,
    ],
    "line-width": [
      "interpolate", ["linear"], freezeWeight(),
      0, 4,
      15, 7,
      60, 12,
    ],
  },
};

function freezeWeight() {
  return [
    "to-number",
    ["coalesce", ["get", "weightSeconds"], ["get", "durationSeconds"], 0],
    0,
  ];
}

export function createReportStalePathMapLayer(map, currentFloor) {
  const group = createGeoJsonLayerGroup(map, [DEFINITION], currentFloor);

  function draw(analysisOrSegments) {
    const segments = staleSegments(analysisOrSegments);
    group.setData(DEFINITION.source, segments.map(stalePathFeature));
    return segments.length;
  }

  return Object.freeze({
    applyFloor: group.applyFloor,
    draw,
    ensure: group.ensure,
    setVisible: group.setVisible,
    get sourceIds() { return group.sourceIds; },
  });
}

function staleSegments(input) {
  if (Array.isArray(input)) {
    return input.every(item => Array.isArray(item?.coordinates)) ? input : [];
  }
  return Array.isArray(input?.stalePathSegments)
    ? input.stalePathSegments
    : [];
}

function stalePathFeature(segment) {
  const { coordinates, ...properties } = segment ?? {};
  const z = Number(properties.z);
  const line = Array.isArray(coordinates)
    ? coordinates.map(coordinate => [
      Number(coordinate?.[0]),
      Number(coordinate?.[1]),
    ])
    : [];
  if (
    !Number.isFinite(z)
    || line.length < 2
    || line.some(coordinate => !coordinate.every(Number.isFinite))
  ) {
    throw new TypeError(
      "Stale path segments require a finite z-level and at least two finite coordinates.",
    );
  }
  return {
    type: "Feature",
    properties: { ...properties, z },
    geometry: {
      type: "LineString",
      coordinates: line,
    },
  };
}
