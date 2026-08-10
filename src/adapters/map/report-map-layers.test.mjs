// FEATURE:      Report heat overlays on the shared geographic map
// SURFACE:      Freeze/sticky/lag/accuracy/room GeoJSON and mode visibility tests
// WHY TOGETHER: One fake map proves weighting, exact coordinates, floor filters, and stable sources.
// STATE:        In-memory source, layer, filter, and visibility calls
// RULES:        Heat uses elapsed seconds and never normalizes geographic coordinates.
// PROVENANCE:   Scope/contracts/report_analysis.md heatmap acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { createReportMapLayers } from "./report-map-layers.mjs";

test("report heat retains exact weighted coordinates and filters the meta floor", () => {
  const harness = mapHarness();
  let floor = 0;
  const layers = createReportMapLayers(harness.map, () => floor);
  const analysis = {
    heatmaps: {
      sticky: [
        { z: 0, points: [{ lng: 170.5001, lat: -45.8701, z: 0, weightSeconds: 2.75 }] },
        { z: 1, points: [{ lng: 170.5004, lat: -45.8704, z: 1, weightSeconds: 1 }] },
      ],
    },
  };
  assert.equal(layers.draw("sticky", analysis), 2);
  layers.drawNotes([{
    id: "note-1",
    routeAnchor: {
      type: "checkpoint-interval",
      routeHash: "a".repeat(64),
      fromCheckpointId: "checkpoint-a",
      toCheckpointId: "checkpoint-b",
      legId: "leg-a-b",
    },
    groundTruth: { lng: 170.51, lat: -45.88, z: 1 },
  }]);
  const features = harness.sources.get("report-sticky-heat").data.features;
  assert.deepEqual(features.map(item => item.geometry.coordinates), [
    [170.5001, -45.8701],
    [170.5004, -45.8704],
  ]);
  assert.deepEqual(features.map(item => item.properties.weightSeconds), [2.75, 1]);
  assert.deepEqual(features.map(item => item.properties.weight), [2.75, 1]);
  assert.equal(
    harness.sources.get("report-notes").data.features[0].properties.routeHash,
    "a".repeat(64),
  );
  assert.deepEqual(harness.filters.get("report-sticky-heat-lyr"), [
    "==", ["get", "z"], 0,
  ]);
  floor = 1;
  layers.applyFloor();
  assert.deepEqual(harness.filters.get("report-sticky-heat-lyr"), [
    "==", ["get", "z"], 1,
  ]);
  assert.deepEqual(
    harness.layers.get("report-sticky-heat-lyr").paint["heatmap-weight"],
    ["get", "weight"],
  );
});

test("heat selection toggles stable layers without adding sources again", () => {
  const harness = mapHarness();
  const layers = createReportMapLayers(harness.map, () => 0);
  layers.draw("sticky", []);
  layers.draw("lag", [{ lng: 1.5, lat: 2.5, z: 0, weight: 11 }]);
  layers.draw("accuracy", [{ lng: 1, lat: 2, z: 0, weightSeconds: 3 }]);
  layers.select("none");
  layers.setVisible(true);
  assert.equal(harness.addSourceCalls, 6);
  assert.equal(harness.addLayerCalls, 6);
  assert.equal(
    harness.sources.get("report-lag-heat").data.features[0].properties.weight,
    11,
  );
  assert.equal(harness.visibility.get("report-freeze-heat-lyr"), "none");
  assert.equal(harness.visibility.get("report-sticky-heat-lyr"), "none");
  assert.equal(harness.visibility.get("report-lag-heat-lyr"), "none");
  assert.equal(harness.visibility.get("report-accuracy-heat-lyr"), "none");
  assert.equal(harness.visibility.get("report-room-heat-lyr"), "none");
});

test("heat and note visibility can be controlled independently", () => {
  const harness = mapHarness();
  const layers = createReportMapLayers(harness.map, () => 0);
  layers.draw("accuracy", []);
  layers.setNotesVisible(false);
  assert.equal(harness.visibility.get("report-accuracy-heat-lyr"), "visible");
  assert.equal(harness.visibility.get("report-notes-lyr"), "none");

  layers.setHeatVisible(false);
  layers.setNotesVisible(true);
  assert.equal(harness.visibility.get("report-accuracy-heat-lyr"), "none");
  assert.equal(harness.visibility.get("report-notes-lyr"), "visible");

  layers.setHeatVisible(true);
  assert.equal(harness.visibility.get("report-sticky-heat-lyr"), "none");
  assert.equal(harness.visibility.get("report-accuracy-heat-lyr"), "visible");
});

test("heat sits below area extrusion while report notes stay above it", () => {
  const harness = mapHarness(true);
  createReportMapLayers(harness.map, () => 0).ensure();
  for (const kind of ["freeze", "sticky", "lag", "accuracy", "room"]) {
    assert.equal(harness.placements.get(`report-${kind}-heat-lyr`),
      "mm-area-extrusion");
  }
  assert.equal(harness.placements.get("report-notes-lyr"), undefined);
});

function mapHarness(withAreaExtrusion = false) {
  const harness = {
    addLayerCalls: 0, addSourceCalls: 0,
    filters: new Map(), layers: new Map(), placements: new Map(),
    sources: new Map(), visibility: new Map(),
  };
  if (withAreaExtrusion) {
    harness.layers.set("mm-area-extrusion", { id: "mm-area-extrusion" });
  }
  harness.map = {
    addLayer(value, beforeLayerId) {
      harness.addLayerCalls += 1;
      harness.layers.set(value.id, value);
      harness.placements.set(value.id, beforeLayerId);
    },
    addSource(id, value) {
      harness.addSourceCalls += 1;
      harness.sources.set(id, {
        data: value.data,
        setData(data) { this.data = data; },
      });
    },
    getLayer: id => harness.layers.get(id),
    getSource: id => harness.sources.get(id),
    setFilter: (id, value) => harness.filters.set(id, value),
    setLayoutProperty: (id, _property, value) => harness.visibility.set(id, value),
  };
  return harness;
}
