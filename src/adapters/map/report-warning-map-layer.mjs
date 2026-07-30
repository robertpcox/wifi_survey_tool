// FEATURE:      Report floor-mismatch map warnings
// SURFACE:      createReportWarningMapLayer(map, currentFloor)
// WHY TOGETHER: Exact warning features, floor filtering, and visibility form one map layer.
// STATE:        One stable GeoJSON source and circle layer
// RULES:        Marker stays at inferred ground truth and retains the reported z-level separately.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import { createGeoJsonLayerGroup } from "./geojson-layer-group.mjs";

const DEFINITION = {
  id: "report-floor-mismatch-lyr",
  source: "report-floor-mismatch",
  type: "circle",
  paint: {
    "circle-color": "#ea580c",
    "circle-radius": 7,
    "circle-stroke-color": "#7c2d12",
    "circle-stroke-width": 2,
    "circle-opacity": 0.88,
  },
};

export function createReportWarningMapLayer(map, currentFloor) {
  const group = createGeoJsonLayerGroup(map, [DEFINITION], currentFloor);

  function draw(warning) {
    const points = warning?.points ?? warning ?? [];
    group.setData(DEFINITION.source, points.map(warningFeature));
    return points.length;
  }

  return Object.freeze({
    applyFloor: group.applyFloor,
    draw,
    ensure: group.ensure,
    setVisible: group.setVisible,
    get sourceIds() { return group.sourceIds; },
  });
}

function warningFeature(point) {
  const lng = Number(point?.lng);
  const lat = Number(point?.lat);
  const z = Number(point?.z);
  const reportedZ = Number(point?.reportedZ);
  if (![lng, lat, z, reportedZ].every(Number.isFinite)) {
    throw new TypeError(
      "Floor-mismatch warnings require finite ground-truth coordinates and z-levels.",
    );
  }
  return {
    type: "Feature",
    properties: {
      ...point,
      kind: "floor-mismatch",
      reportedZ,
      z,
    },
    geometry: { type: "Point", coordinates: [lng, lat] },
  };
}
