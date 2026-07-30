// FEATURE:      One shared Report and Player geographic map
// SURFACE:      Analysis/playback mode isolation tests
// WHY TOGETHER: Stable source counts, visibility toggles, and hidden-write blocking prove one map.
// STATE:        Fake map source data and add counts
// RULES:        Analysis never leaks Player layers; disabled Player frames perform no writes.
// PROVENANCE:   Scope/steps/05a_recast_player.md shared-map acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { createSharedMapLayers } from "./shared-map-layers.mjs";

test("mode switching reuses sources and blocks disabled Player writes", () => {
  const harness = mapHarness();
  const layers = createSharedMapLayers(harness.map, () => 0);
  assert.equal(layers.followWalker({ lng: 170.1, lat: -45.1, z: 0 }), false);
  layers.drawReportHeat("sticky", [
    { lng: 170.1, lat: -45.1, z: 0, weightSeconds: 2 },
  ]);
  layers.drawReportHeat("sticky", {
    heatmaps: { sticky: [] },
    warnings: {
      floorMismatch: {
        points: [{
          lng: 170.2, lat: -45.2, z: 0, reportedZ: 1,
          pollId: "poll-floor", weightSeconds: 2,
        }],
      },
    },
  });
  assert.equal(
    harness.sources.get("report-floor-mismatch").data.features[0].properties.reportedZ,
    1,
  );
  layers.setViewMode("playback");
  const sourceCount = harness.sources.size;
  const layerCount = harness.layers.size;
  assert.equal(layers.followWalker({ lng: 170.1, lat: -45.1, z: 0 }), true);
  assert.deepEqual(harness.cameras, [{
    center: [170.1, -45.1],
    duration: 400,
  }]);
  assert.equal(layers.drawPlayerFrame({
    rawFix: { lng: 170.2, lat: -45.2, z: 0 },
  }), true);
  const before = harness.sources.get("player-raw-fix").writes;
  layers.disablePlayerLayers();
  assert.equal(layers.followWalker({ lng: 170.3, lat: -45.3, z: 0 }), false);
  assert.equal(harness.cameras.length, 1);
  assert.equal(layers.drawPlayerFrame({
    rawFix: { lng: 170.3, lat: -45.3, z: 0 },
  }), false);
  assert.equal(harness.sources.get("player-raw-fix").writes, before);
  layers.setViewMode("analysis");
  assert.equal(harness.sources.size, sourceCount);
  assert.equal(harness.layers.size, layerCount);
  assert.equal(harness.visibility.get("player-raw-fix-lyr"), "none");
  assert.equal(harness.visibility.get("report-sticky-heat-lyr"), "visible");
  assert.equal(harness.visibility.get("report-floor-mismatch-lyr"), "visible");
});

function mapHarness() {
  const harness = {
    cameras: [], layers: new Map(), sources: new Map(), visibility: new Map(),
  };
  harness.map = {
    addLayer: value => harness.layers.set(value.id, value),
    addSource(id, value) {
      harness.sources.set(id, {
        data: value.data,
        writes: 0,
        setData(data) { this.data = data; this.writes += 1; },
      });
    },
    getLayer: id => harness.layers.get(id),
    getBounds: () => ({
      getWest: () => 0, getEast: () => 1,
      getSouth: () => 0, getNorth: () => 1,
    }),
    getSource: id => harness.sources.get(id),
    easeTo: camera => harness.cameras.push(camera),
    on() {},
    setFeatureState() {},
    setFilter() {},
    setLayoutProperty: (id, _property, value) => harness.visibility.set(id, value),
  };
  return harness;
}
