// FEATURE:      Report Wi-Fi result positions
// SURFACE:      createReportWifiMapLayer(map, currentFloor)
// WHY TOGETHER: Exact normalized fixes, native-floor filtering, and visibility form one overlay.
// STATE:        One stable GeoJSON source and circle layer
// RULES:        Every feature uses the captured fix lng, lat, and z without projection or correction.
// PROVENANCE:   Scope/steps/05b_improve_report.md selected-run evidence

import { createGeoJsonLayerGroup } from "./geojson-layer-group.mjs";

const DEFINITION = {
  id: "report-wifi-fixes-lyr",
  source: "report-wifi-fixes",
  type: "circle",
  paint: {
    "circle-color": "#2563eb",
    "circle-opacity": 0.55,
    "circle-radius": 4,
    "circle-stroke-color": "#fff",
    "circle-stroke-width": 1,
  },
};

export function createReportWifiMapLayer(map, currentFloor) {
  const group = createGeoJsonLayerGroup(map, [DEFINITION], currentFloor);

  function draw(analysis) {
    const timeline = Array.isArray(analysis?.timeline) ? analysis.timeline : [];
    const features = timeline.map(wifiFixFeature);
    group.setData(DEFINITION.source, features);
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

function wifiFixFeature(sample) {
  const lng = Number(sample?.fix?.lng);
  const lat = Number(sample?.fix?.lat);
  const z = Number(sample?.fix?.z);
  if (![lng, lat, z].every(Number.isFinite)) {
    throw new TypeError("Report Wi-Fi fixes require finite normalized lng, lat, and z.");
  }
  return {
    type: "Feature",
    properties: {
      kind: "wifi-position",
      pollId: sample.pollId ?? null,
      receivedAt: sample.receivedAt ?? null,
      z,
    },
    geometry: { type: "Point", coordinates: [lng, lat] },
  };
}
