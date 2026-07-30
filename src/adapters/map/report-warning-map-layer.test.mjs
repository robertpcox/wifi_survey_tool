// FEATURE:      Report floor-mismatch map warnings
// SURFACE:      node --test src/adapters/map/report-warning-map-layer.test.mjs
// WHY TOGETHER: Exact coordinates, evidence properties, and floor filtering prove the layer contract.
// STATE:        Fake GeoJSON map registry
// RULES:        Reported floor never replaces ground-truth display floor.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import test from "node:test";

import { createReportWarningMapLayer } from "./report-warning-map-layer.mjs";

test("floor warning retains exact ground truth and reported z separately", () => {
  const harness = mapHarness();
  let floor = 1;
  const layer = createReportWarningMapLayer(harness.map, () => floor);
  assert.equal(layer.draw({
    points: [{
      at: "2026-07-30T01:00:00.000Z",
      lat: -45.8701,
      lng: 170.5001,
      z: 1,
      reportedZ: 2,
      pollId: "poll-floor",
      weightSeconds: 2,
    }],
  }), 1);
  const feature = harness.sources.get("report-floor-mismatch").data.features[0];
  assert.deepEqual(feature.geometry.coordinates, [170.5001, -45.8701]);
  assert.equal(feature.properties.z, 1);
  assert.equal(feature.properties.reportedZ, 2);
  assert.equal(feature.properties.pollId, "poll-floor");
  assert.deepEqual(harness.filters.get("report-floor-mismatch-lyr"), [
    "==", ["get", "z"], 1,
  ]);
  floor = 2;
  layer.applyFloor();
  assert.deepEqual(harness.filters.get("report-floor-mismatch-lyr"), [
    "==", ["get", "z"], 2,
  ]);
});

function mapHarness() {
  const harness = {
    filters: new Map(),
    layers: new Map(),
    sources: new Map(),
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
    setFilter: (id, filter) => harness.filters.set(id, filter),
    setLayoutProperty(id, property, value) {
      harness.layers.get(id).layout[property] = value;
    },
  };
  return harness;
}
