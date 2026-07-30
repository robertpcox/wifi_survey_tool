// FEATURE:      Report floor-mismatch map warnings
// SURFACE:      createReportWarningMapLayer(map, currentFloor)
// WHY TOGETHER: Paired warning features, floor filtering, and visibility form one map layer.
// STATE:        Stable truth and reported GeoJSON sources with distinct circle layers
// RULES:        Truth and reported endpoints retain exact coordinates and display on their own floors.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import { createGeoJsonLayerGroup } from "./geojson-layer-group.mjs";

const TRUTH_DEFINITION = {
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

const REPORTED_DEFINITION = {
  id: "report-floor-mismatch-reported-lyr",
  source: "report-floor-mismatch-reported",
  type: "circle",
  paint: {
    "circle-color": "#fff7ed",
    "circle-radius": 6,
    "circle-stroke-color": "#c2410c",
    "circle-stroke-width": 3,
    "circle-opacity": 0.94,
  },
};

export function createReportWarningMapLayer(map, currentFloor) {
  const group = createGeoJsonLayerGroup(
    map,
    [TRUTH_DEFINITION, REPORTED_DEFINITION],
    currentFloor,
  );

  function draw(warning) {
    const points = warning?.points ?? warning ?? [];
    const pairs = points.map(warningFeatures);
    group.setData(TRUTH_DEFINITION.source, pairs.map(pair => pair.truth));
    group.setData(
      REPORTED_DEFINITION.source,
      pairs.flatMap(pair => pair.reported ?? []),
    );
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

function warningFeatures(point) {
  const lng = Number(point?.lng);
  const lat = Number(point?.lat);
  const z = Number(point?.z);
  const reportedLng = Number(point?.reportedLng);
  const reportedLat = Number(point?.reportedLat);
  const reportedZ = Number(point?.reportedZ);
  if (![lng, lat, z, reportedZ].every(Number.isFinite)) {
    throw new TypeError(
      "Floor-mismatch warnings require finite truth coordinates and z-levels.",
    );
  }
  const pairId = `${point.pollId ?? "poll"}:${point.atMs ?? point.at ?? "time"}`;
  const hasReportedPosition = [reportedLng, reportedLat].every(Number.isFinite);
  const shared = {
    ...point,
    kind: "floor-mismatch",
    pairId,
    reportedZ,
    truthLng: lng,
    truthLat: lat,
    truthZ: z,
  };
  if (hasReportedPosition) {
    shared.reportedLng = reportedLng;
    shared.reportedLat = reportedLat;
  }
  const truth = pointFeature({
    ...shared,
    endpoint: "ground-truth",
    lng,
    lat,
    z,
  });
  const reported = hasReportedPosition
    ? pointFeature({
      ...shared,
      endpoint: "reported-fix",
      lng: reportedLng,
      lat: reportedLat,
      z: reportedZ,
    })
    : null;
  return { truth, reported };
}

function pointFeature(properties) {
  return {
    type: "Feature",
    properties,
    geometry: {
      type: "Point",
      coordinates: [properties.lng, properties.lat],
    },
  };
}
