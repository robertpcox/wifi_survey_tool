// FEATURE:      Provider-neutral GeoJSON layer registry
// SURFACE:      Stable registry lifecycle tests
// WHY TOGETHER: One harness proves source stability, floor filters, writes, and visibility.
// STATE:        In-memory source/layer/filter records
// RULES:        Repeated ensure and mode toggles must not add duplicate layers.
// PROVENANCE:   Scope/steps/05a_recast_player.md shared-map layer acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { createGeoJsonLayerGroup } from "./geojson-layer-group.mjs";

test("group installs stable layers once and updates exact source data and floor", () => {
  const harness = mapHarness();
  let floor = 1;
  const group = createGeoJsonLayerGroup(harness.map, [{
    id: "test-layer",
    source: "test-source",
    type: "circle",
    paint: { "circle-color": "#000" },
  }], () => floor);
  group.ensure();
  group.ensure();
  assert.equal(harness.addSourceCalls, 1);
  assert.equal(harness.addLayerCalls, 1);
  assert.deepEqual(harness.filters.at(-1), [
    "test-layer", ["==", ["get", "z"], 1],
  ]);
  const feature = {
    type: "Feature",
    properties: { z: 1 },
    geometry: { type: "Point", coordinates: [170.5, -45.8] },
  };
  group.setData("test-source", [feature]);
  assert.deepEqual(harness.sources.get("test-source").data.features, [feature]);
  floor = 2;
  group.applyFloor();
  group.setVisible(false);
  assert.deepEqual(harness.filters.at(-1), [
    "test-layer", ["==", ["get", "z"], 2],
  ]);
  assert.deepEqual(harness.visibility.at(-1), ["test-layer", "visibility", "none"]);
});

test("group can filter a display floor without rewriting reported z", () => {
  const harness = mapHarness();
  const group = createGeoJsonLayerGroup(harness.map, [{
    id: "raw-fix-layer",
    source: "raw-fix-source",
    type: "circle",
    floorProperty: "displayZ",
  }], () => 0);
  const feature = {
    type: "Feature",
    properties: { displayZ: 0, reportedZ: 2, wrongFloor: true, z: 2 },
    geometry: { type: "Point", coordinates: [170.5, -45.8] },
  };
  group.setData("raw-fix-source", [feature]);
  assert.deepEqual(harness.filters.at(-1), [
    "raw-fix-layer", ["==", ["get", "displayZ"], 0],
  ]);
  assert.deepEqual(harness.sources.get("raw-fix-source").data.features, [feature]);
});

function mapHarness() {
  const harness = {
    addLayerCalls: 0,
    addSourceCalls: 0,
    filters: [],
    layers: new Map(),
    sources: new Map(),
    visibility: [],
  };
  harness.map = {
    addLayer(value) { harness.addLayerCalls += 1; harness.layers.set(value.id, value); },
    addSource(id, value) {
      harness.addSourceCalls += 1;
      harness.sources.set(id, {
        data: value.data,
        setData(data) { this.data = data; },
      });
    },
    getLayer: id => harness.layers.get(id),
    getSource: id => harness.sources.get(id),
    setFilter: (...args) => harness.filters.push(args),
    setLayoutProperty: (...args) => harness.visibility.push(args),
  };
  return harness;
}
