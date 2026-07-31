// FEATURE:      Staged-leg map layer tests
// SURFACE:      drawStagedLeg source data and upcoming-leg styling
// WHY TOGETHER: The upcoming corridor line must render and clear on one source.
// STATE:        Fake map recording sources and layers
// RULES:        The upcoming style stays distinct from route and active-leg lines.
// PROVENANCE:   Staged-leg route preview request

import assert from "node:assert/strict";
import test from "node:test";

import { createMapLayers } from "./layers.mjs";
import { createLayerStyles } from "./layer-styles.mjs";

function mapHarness() {
  const sources = new Map();
  const layers = new Map();
  return {
    sources,
    layers,
    getSource: id => sources.get(id),
    getLayer: id => layers.get(id),
    addSource(id, definition) {
      sources.set(id, {
        data: definition.data,
        setData(data) { this.data = data; },
      });
    },
    addLayer(definition) { layers.set(definition.id, definition); },
    setFilter() {},
    setPaintProperty() {},
  };
}

test("drawStagedLeg renders the upcoming corridor and clears it again", () => {
  const map = mapHarness();
  const adapter = createMapLayers(map, () => 1);
  adapter.drawStagedLeg([
    { lng: 170.5085, lat: -45.8724, z: 1 },
    { lng: 170.5085, lat: -45.8722, z: 1 },
  ]);
  const source = map.getSource("staged-leg");
  assert.equal(source.data.features.length, 1);
  assert.equal(source.data.features[0].geometry.type, "LineString");
  assert.deepEqual(source.data.features[0].geometry.coordinates, [
    [170.5085, -45.8724],
    [170.5085, -45.8722],
  ]);
  assert.equal(source.data.features[0].properties.staged, true);
  adapter.drawStagedLeg([]);
  assert.deepEqual(map.getSource("staged-leg").data.features, []);
});

test("the upcoming-leg style is distinct from route and active-leg lines", () => {
  const map = mapHarness();
  createMapLayers(map, () => 1).ensureLayers();
  const layer = map.getLayer("staged-leg-lyr");
  assert.equal(layer.source, "staged-leg");
  assert.deepEqual(layer.paint["line-dasharray"], [1.5, 1.5]);
  const styles = createLayerStyles(() => 1);
  assert.notDeepEqual(styles.upcomingRoute, styles.route);
  assert.notDeepEqual(styles.upcomingRoute, styles.activeRoute);
  assert.equal(styles.upcomingRoute["line-width"], 5);
});
