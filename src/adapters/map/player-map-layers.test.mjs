// FEATURE:      Full-screen Player shared-map adapter
// SURFACE:      Player source writes, floor filtering, and stable layer lifecycle tests
// WHY TOGETHER: One fake map proves deterministic frames do not recreate layers.
// STATE:        In-memory source/layer/filter/visibility records
// RULES:        Exact GeoJSON persists while visibility changes by mode.
// PROVENANCE:   Scope/steps/05a_recast_player.md shared Player map acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { createPlayerMapLayers } from "./player-map-layers.mjs";

test("Player frames write stable floor-filtered sources without recreation", () => {
  const harness = mapHarness();
  let floor = 0;
  const layers = createPlayerMapLayers(harness.map, () => floor);
  layers.drawFrame({
    walker: { lng: 170.1, lat: -45.1, z: 0 },
    rawFix: { lng: 170.2, lat: -45.2, z: 0 },
  });
  const sourceCount = harness.sources.size;
  const layerCount = harness.layers.size;
  layers.drawFrame({
    walker: { lng: 170.3, lat: -45.3, z: 1 },
    rawFix: { lng: 170.4, lat: -45.4, z: 2 },
  });
  assert.equal(harness.sources.size, sourceCount);
  assert.equal(harness.layers.size, layerCount);
  assert.deepEqual(
    harness.sources.get("player-raw-fix").data.features[0].geometry.coordinates,
    [170.4, -45.4],
  );
  assert.deepEqual(
    harness.sources.get("player-raw-fix").data.features[0].properties,
    {
      role: "raw-fix", displayZ: 1, reportedZ: 2,
      floorMatch: false, wrongFloor: true, pollId: null, z: 2,
    },
  );
  floor = 1;
  layers.applyFloor();
  assert.deepEqual(harness.filters.get("player-raw-fix-lyr"), [
    "==", ["get", "displayZ"], 1,
  ]);
  layers.setVisible(false);
  assert.equal(harness.visibility.get("player-walker-lyr"), "none");
});

function mapHarness() {
  const harness = {
    filters: new Map(), handlers: new Map(), layers: new Map(),
    sources: new Map(), visibility: new Map(),
  };
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
    on: (type, layer, callback) => harness.handlers.set(`${type}:${layer}`, callback),
    setFeatureState() {},
    setFilter: (id, value) => harness.filters.set(id, value),
    setLayoutProperty: (id, _property, value) => harness.visibility.set(id, value),
  };
  return harness;
}
