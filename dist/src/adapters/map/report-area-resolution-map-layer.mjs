// FEATURE:      MazeMap area-resolution map evidence
// SURFACE:      createReportAreaResolutionMapLayer(map, currentFloor)
// WHY TOGETHER: Inside/outside truth points, raw Cisco drift, and connectors form one overlay.
// STATE:        Four stable GeoJSON sources filtered by displayed floor
// RULES:        Green/red status uses polygon scoring; observed coordinates are never snapped.
// PROVENANCE:   Dynamic room and long-corridor area resolution

import { createGeoJsonLayerGroup } from "./geojson-layer-group.mjs";
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
    "circle-radius": ["match", ["get", "verdict"], "inside", 4, 6],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 1.5,
    "circle-opacity": 0.9,
  },
}, {
  id: "report-area-resolution-drift-lyr",
  source: "report-area-resolution-drift",
  type: "line",
  paint: {
    "line-color": "#dc2626",
    "line-width": 2,
    "line-opacity": 0.55,
    "line-dasharray": [2, 2],
  },
}, {
  id: "report-area-resolution-cisco-lyr",
  source: "report-area-resolution-cisco",
  type: "circle",
  paint: {
    "circle-color": "#ffffff",
    "circle-radius": 5,
    "circle-stroke-color": ["match", ["get", "verdict"],
      "inside", "#16a34a", "outside", "#dc2626",
      "wrong-floor", "#f97316", "no-position", "#64748b", "#94a3b8"],
    "circle-stroke-width": 2.5,
    "circle-opacity": 0.95,
  },
}];

export function createReportAreaResolutionMapLayer(map, currentFloor) {
  const group = createGeoJsonLayerGroup(map, DEFINITIONS, currentFloor);

  function draw(summary) {
    const observations = summary?.areaObservations ?? [];
    const features = observations.map(areaFeatures);
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

function areaFeatures(observation) {
  const target = observation.target;
  const shared = {
    pairId: `area:${observation.resultId}:${observation.checkpointId}`,
    resultId: observation.resultId,
    checkpointId: observation.checkpointId,
    areaName: observation.expectedRoom?.name ?? observation.roomLabel,
    observationKind: observation.observationKind,
    status: observation.primary.status,
  };
  const verdict = momentVerdict(observation.primary);
  const truth = pointFeature(target, {
    ...shared, markerRole: "expected-sample", verdict,
  });
  const moments = displayedMoments(observation);
  const cisco = moments.filter(item => item.moment?.point).map(item => (
    pointFeature(item.moment.point, {
      ...shared, markerRole: "cisco-position",
      phase: item.phase, verdict: momentVerdict(item.moment),
      resolvedAreaId: item.moment.room?.id ?? null,
      resolvedAreaName: item.moment.room?.name ?? null,
    })
  ));
  const line = moments.filter(item => (
    item.moment?.point
      && momentVerdict(item.moment) === "outside"
      && Number(target.z) === Number(item.moment.point.z)
  )).map(item => ({
    type: "Feature",
    properties: { ...shared, z: target.z, phase: item.phase, verdict: "outside" },
    geometry: { type: "LineString", coordinates: [
      [target.lng, target.lat], [item.moment.point.lng, item.moment.point.lat],
    ] },
  }));
  return { truth, line, cisco };
}

function displayedMoments(observation) {
  if (observation.observationKind === "dwell" && observation.moments?.length) {
    return observation.moments.map((moment, index, moments) => ({
      phase: index === 0 ? "entry" : (index === moments.length - 1 ? "exit" : "dwell"),
      moment,
    }));
  }
  const phase = observation.observationKind === "dwell" ? "exit" : "sample";
  const moments = [{ phase, moment: observation.primary }];
  if (observation.observationKind === "dwell"
      && observation.entry?.status !== observation.primary?.status) {
    moments.unshift({ phase: "entry", moment: observation.entry });
  }
  return moments;
}
function momentVerdict(moment) {
  if (moment?.status === "resolved") return "inside";
  if (["wrong-room", "unresolved"].includes(moment?.status)) return "outside";
  if (moment?.status === "wrong-floor") return "wrong-floor";
  if (moment?.status === "no-displayed-fix") return "no-position";
  return "unscored";
}
function pointFeature(point, properties) {
  return {
    type: "Feature",
    properties: { ...properties, z: point.z },
    geometry: { type: "Point", coordinates: [point.lng, point.lat] },
  };
}
