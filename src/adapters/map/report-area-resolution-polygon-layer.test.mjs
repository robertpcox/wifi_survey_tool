// FEATURE:      MazeMap area-resolution polygon paint
// SURFACE:      node --test src/adapters/map/report-area-resolution-polygon-layer.test.mjs
// WHY TOGETHER: Polygon geometry, percentage properties, and continuous paint share one contract.
// STATE:        In-memory map sources
// RULES:        Scored areas interpolate red-to-green; unscored areas stay neutral.
// PROVENANCE:   Dynamic room and long-corridor area resolution

import assert from "node:assert/strict";
import test from "node:test";

import { createReportAreaResolutionMapLayer } from "./report-area-resolution-map-layer.mjs";

test("area layer fills Polygon and MultiPolygon areas on a continuous percentage scale", () => {
  const harness = mapHarness();
  const layer = createReportAreaResolutionMapLayer(harness.map, () => 2);
  const polygon = { type: "Polygon", coordinates: [[
    [170.5, -45.8], [170.6, -45.8], [170.6, -45.7],
    [170.5, -45.7], [170.5, -45.8],
  ]] };
  const multiPolygon = { type: "MultiPolygon", coordinates: [[[
    [170.7, -45.8], [170.8, -45.8], [170.8, -45.7],
    [170.7, -45.7], [170.7, -45.8],
  ]]] };
  layer.draw({ areaObservations: [], areaPolygons: [{
    areaKey: "poi:clinic:z:2", poiId: "clinic", areaName: "Clinic", z: 2,
    geometry: polygon, severity: "mixed", observationCount: 4,
    scoredSampleCount: 4, insideSampleCount: 3, outsideSampleCount: 1,
    resolutionPercent: 75, runCount: 2,
  }, {
    areaKey: "poi:hall:z:3", poiId: "hall", areaName: "Hall", z: 3,
    geometry: multiPolygon, severity: "bad", observationCount: 2,
    scoredSampleCount: 2, insideSampleCount: 0, outsideSampleCount: 2,
    resolutionPercent: 0, runCount: 1,
  }] });
  const areas = features(harness, "report-area-resolution-area");
  assert.deepEqual(areas.map(item => item.geometry.type), ["Polygon", "MultiPolygon"]);
  assert.deepEqual(areas.map(item => item.properties.resolutionPercent), [75, 0]);
  assert.deepEqual(areas.map(item => item.properties.scored), [true, true]);
  assert.deepEqual(areas.map(item => item.properties.z), [2, 3]);
  assert.equal(areas[0].geometry, polygon);
  const fill = harness.layers.get("report-area-resolution-area-lyr");
  assert.equal(fill.type, "fill");
  assert.deepEqual(fill.paint["fill-color"], ["case",
    ["boolean", ["get", "scored"], false],
    ["interpolate", ["linear"],
      ["to-number", ["get", "resolutionPercent"], 0],
      0, "#b91c1c", 50, "#d97706", 100, "#15803d"],
    "#64748b"]);
  assert.deepEqual(fill.paint["fill-opacity"], [
    "case", ["boolean", ["get", "scored"], false], 0.5, 0.18,
  ]);
  assert.deepEqual(harness.filters.get("report-area-resolution-area-lyr"),
    ["==", ["get", "z"], 2]);
});

function features(harness, id) {
  return harness.sources.get(id).data.features;
}

function mapHarness() {
  const harness = { layers: new Map(), sources: new Map(), filters: new Map() };
  harness.map = {
    addLayer: value => harness.layers.set(value.id, value),
    addSource(id, value) {
      harness.sources.set(id, {
        data: value.data,
        setData(data) { this.data = data; },
      });
    },
    getLayer: id => harness.layers.get(id),
    getSource: id => harness.sources.get(id),
    setFilter: (id, filter) => harness.filters.set(id, filter),
    setLayoutProperty() {},
  };
  return harness;
}
