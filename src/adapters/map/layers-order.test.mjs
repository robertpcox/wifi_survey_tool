// FEATURE:      Survey route overlay placement
// SURFACE:      createMapLayers(map).ensureLayers()
// WHY TOGETHER: One map harness proves line-under-building and point-over-building order.
// STATE:        Recorded addLayer definitions and optional before ids
// RULES:        Route lines sit below area extrusion; trail and checkpoint points stay above it.
// PROVENANCE:   Runner field feedback for 3D area-extrusion stacking

import assert from "node:assert/strict";
import test from "node:test";

import { createMapLayers } from "./layers.mjs";
import { AREA_EXTRUSION_LAYER_ID } from "./map-layer-order.mjs";

test("route layers use area extrusion anchor while evidence layers append above it", () => {
  const placements = new Map();
  const layers = new Map([[AREA_EXTRUSION_LAYER_ID, { id: AREA_EXTRUSION_LAYER_ID }]]);
  const sources = new Map();
  const map = {
    addLayer(definition, beforeLayerId) {
      layers.set(definition.id, definition);
      placements.set(definition.id, beforeLayerId);
    },
    addSource(id, definition) {
      sources.set(id, { data: definition.data, setData(data) { this.data = data; } });
    },
    getLayer: id => layers.get(id),
    getSource: id => sources.get(id),
    setFilter() {},
    setPaintProperty() {},
  };
  createMapLayers(map, () => 0).ensureLayers();
  assert.equal(placements.get("route-lines-lyr"), AREA_EXTRUSION_LAYER_ID);
  assert.equal(placements.get("route-active-lyr"), AREA_EXTRUSION_LAYER_ID);
  for (const id of [
    "cloud-trail-lyr", "lipi-trail-lyr", "cloud-pts-lyr", "lipi-pts-lyr",
    "wp-pts-lyr", "stop-pts-lyr",
  ]) {
    assert.equal(placements.get(id), undefined, `${id} should append above buildings`);
  }
});
