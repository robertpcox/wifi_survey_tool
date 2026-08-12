// FEATURE:      Shared map zone-area highlight
// SURFACE:      node --test src/adapters/map/shared-map-zone-highlight.test.mjs
// WHY TOGETHER: Zone selection, area visibility, and room-summary isolation form one contract.
// STATE:        Fake stable GeoJSON layers
// RULES:        Zone mode draws its own polygons and never the room compatibility alias.
// PROVENANCE:   MazeMap zone resolution

import assert from "node:assert/strict";
import test from "node:test";

import { createSharedMapLayers } from "./shared-map-layers.mjs";

test("zone highlight draws only zone polygons and hides generic heat", () => {
  const harness = mapHarness();
  const layers = createSharedMapLayers(harness.map, () => 2);
  layers.setViewMode("analysis");
  layers.drawReportHeat("zone", {
    areaResolution: summary("Room", "room", 170.2),
    areaResolutions: { zone: summary("Bed zone", "zone", 170.27) },
  });
  assert.equal(layers.highlightKind, "zone");
  assert.equal(harness.visibility.get("report-room-heat-lyr"), "none");
  assert.equal(harness.visibility.get("report-area-resolution-area-lyr"), "visible");
  assert.equal(harness.sources.get("report-area-resolution-area")
    .data.features[0].properties.areaName, "Bed zone");
});

function summary(areaName, areaKind, lng) {
  return { areaObservations: [], areaPolygons: [{
    areaKey: areaName, areaName, areaKind, z: 2,
    scoredSampleCount: 1, insideSampleCount: 1, outsideSampleCount: 0,
    resolutionPercent: 100, geometry: { type: "Polygon", coordinates: [[
      [lng, -45.25], [lng + 0.01, -45.25],
      [lng + 0.01, -45.24], [lng, -45.25],
    ]] },
  }] };
}

function mapHarness() {
  const harness = { layers: new Map(), sources: new Map(), visibility: new Map() };
  harness.map = {
    addLayer: value => harness.layers.set(value.id, value),
    addSource(id, value) { harness.sources.set(id, {
      data: value.data, setData(data) { this.data = data; },
    }); },
    getLayer: id => harness.layers.get(id), getSource: id => harness.sources.get(id),
    on() {}, setFeatureState() {}, setFilter() {},
    setLayoutProperty: (id, _property, value) => harness.visibility.set(id, value),
  };
  return harness;
}
