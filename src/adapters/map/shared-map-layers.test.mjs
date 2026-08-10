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
  const analysis = {
    heatmaps: { sticky: [] },
    stalePathSegments: [{
      z: 0,
      coordinates: [
        [170.2, -45.2],
        [170.21, -45.21],
        [170.22, -45.2],
      ],
      pollId: "poll-stale",
      durationSeconds: 7,
    }],
    timeline: [{
      pollId: "poll-wifi",
      receivedAt: "2026-07-30T01:08:53.826Z",
      fix: { lng: 170.25, lat: -45.25, z: 1 },
      groundTruth: { lng: 170.2, lat: -45.2, z: 0 },
    }],
    warnings: {
      floorMismatch: {
        points: [{
          lng: 170.2, lat: -45.2, z: 0, reportedZ: 1,
          pollId: "poll-floor", weightSeconds: 2,
        }],
      },
    },
  };
  layers.drawReportHeat("sticky", analysis);
  assert.equal(
    harness.sources.get("report-floor-mismatch").data.features[0].properties.reportedZ,
    1,
  );
  const wifi = harness.sources.get("report-wifi-fixes").data.features[0];
  assert.deepEqual(wifi.geometry.coordinates, [170.25, -45.25]);
  assert.equal(wifi.properties.z, 1);
  const stalePath = harness.sources.get("report-stale-path").data.features[0];
  assert.deepEqual(stalePath.geometry.coordinates, [
    [170.2, -45.2],
    [170.21, -45.21],
    [170.22, -45.2],
  ]);
  assert.equal(stalePath.properties.pollId, "poll-stale");
  const layerOrder = [...harness.layers.keys()];
  assert.ok(
    layerOrder.indexOf("report-sticky-heat-lyr")
      < layerOrder.indexOf("report-stale-path-lyr"),
  );
  assert.ok(
    layerOrder.indexOf("report-stale-path-lyr")
      < layerOrder.indexOf("report-wifi-fixes-lyr"),
  );
  assert.ok(
    layerOrder.indexOf("report-wifi-fixes-lyr")
      < layerOrder.indexOf("report-floor-mismatch-lyr"),
  );
  layers.drawReportNotes([{
    id: "note-1",
    groundTruth: { lng: 170.23, lat: -45.23, z: 0 },
  }]);
  layers.setViewMode("playback");
  assert.equal(harness.visibility.get("report-stale-path-lyr"), "visible");
  assert.equal(harness.visibility.get("report-sticky-heat-lyr"), "visible");
  assert.equal(harness.visibility.get("report-notes-lyr"), "none");
  assert.equal(harness.visibility.get("report-floor-mismatch-lyr"), "none");
  assert.equal(harness.visibility.get("report-wifi-fixes-lyr"), "none");
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
  assert.equal(harness.visibility.get("report-wifi-fixes-lyr"), "visible");
  assert.equal(harness.visibility.get("report-stale-path-lyr"), "visible");
  assert.ok(layers.sourceIds.includes("report-stale-path"));
  assert.ok(layers.sourceIds.includes("report-area-resolution-cisco"));
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
