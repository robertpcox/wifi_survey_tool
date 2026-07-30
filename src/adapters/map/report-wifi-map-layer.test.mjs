// FEATURE:      Report Wi-Fi result positions
// SURFACE:      Exact normalized-fix GeoJSON and native-floor filtering tests
// WHY TOGETHER: One fake map proves captured coordinates, z-levels, and stable source behavior.
// STATE:        In-memory source, layer, filter, and visibility calls
// RULES:        The overlay never substitutes route-ground-truth coordinates or z.
// PROVENANCE:   Scope/steps/05b_improve_report.md selected-run evidence

import assert from "node:assert/strict";
import test from "node:test";

import { createReportWifiMapLayer } from "./report-wifi-map-layer.mjs";

test("Wi-Fi result positions retain exact fix coordinates and follow native floor", () => {
  const harness = mapHarness();
  let floor = 1;
  const layer = createReportWifiMapLayer(harness.map, () => floor);
  assert.equal(layer.draw({
    timeline: [
      {
        pollId: "poll-1",
        receivedAt: "2026-07-30T01:08:53.826Z",
        fix: { lng: 170.50844053963183, lat: -45.872430093656234, z: 1 },
        groundTruth: { lng: 170.5, lat: -45.8, z: 2 },
      },
      {
        pollId: "poll-2",
        receivedAt: "2026-07-30T01:08:55.826Z",
        fix: { lng: 170.5085, lat: -45.8725, z: 2 },
      },
    ],
  }), 2);

  const features = harness.sources.get("report-wifi-fixes").data.features;
  assert.deepEqual(features.map(feature => feature.geometry.coordinates), [
    [170.50844053963183, -45.872430093656234],
    [170.5085, -45.8725],
  ]);
  assert.deepEqual(features.map(feature => feature.properties.z), [1, 2]);
  assert.equal(features[0].properties.pollId, "poll-1");
  assert.deepEqual(harness.filters.get("report-wifi-fixes-lyr"), [
    "==", ["get", "z"], 1,
  ]);

  floor = 2;
  layer.applyFloor();
  assert.deepEqual(harness.filters.get("report-wifi-fixes-lyr"), [
    "==", ["get", "z"], 2,
  ]);
});

test("Wi-Fi result positions reject incomplete normalized fixes", () => {
  const harness = mapHarness();
  const layer = createReportWifiMapLayer(harness.map, () => 1);
  assert.throws(
    () => layer.draw({ timeline: [{ fix: { lng: 170.5, lat: -45.8 } }] }),
    /finite normalized lng, lat, and z/,
  );
});

function mapHarness() {
  const harness = {
    filters: new Map(), layers: new Map(), sources: new Map(),
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
    setFilter: (id, value) => harness.filters.set(id, value),
    setLayoutProperty() {},
  };
  return harness;
}
