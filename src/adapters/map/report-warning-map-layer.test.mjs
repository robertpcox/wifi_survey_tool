// FEATURE:      Report floor-mismatch map warnings
// SURFACE:      node --test src/adapters/map/report-warning-map-layer.test.mjs
// WHY TOGETHER: Exact coordinates, evidence properties, and floor filtering prove the layer contract.
// STATE:        Fake GeoJSON map registry
// RULES:        Reported floor never replaces ground-truth display floor.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import test from "node:test";

import { createReportWarningMapLayer } from "./report-warning-map-layer.mjs";

test("floor warning pairs exact truth and reported endpoints on their own floors", () => {
  const harness = mapHarness();
  let floor = 1;
  const layer = createReportWarningMapLayer(harness.map, () => floor);
  assert.equal(layer.draw({
    points: [{
      at: "2026-07-30T01:00:00.000Z",
      lat: -45.8701,
      lng: 170.5001,
      z: 1,
      reportedLat: -45.8703,
      reportedLng: 170.5004,
      reportedZ: 2,
      pollId: "poll-floor",
      weightSeconds: 2,
    }],
  }), 1);
  const [truth] = harness.sources.get("report-floor-mismatch").data.features;
  const [reported] = harness.sources
    .get("report-floor-mismatch-reported").data.features;
  assert.deepEqual(truth.geometry.coordinates, [170.5001, -45.8701]);
  assert.deepEqual(reported.geometry.coordinates, [170.5004, -45.8703]);
  assert.equal(truth.properties.endpoint, "ground-truth");
  assert.equal(reported.properties.endpoint, "reported-fix");
  assert.equal(truth.properties.z, 1);
  assert.equal(reported.properties.z, 2);
  assert.equal(truth.properties.truthZ, 1);
  assert.equal(reported.properties.truthZ, 1);
  assert.equal(truth.properties.reportedZ, 2);
  assert.equal(reported.properties.reportedZ, 2);
  assert.equal(truth.properties.pairId, reported.properties.pairId);
  assert.equal(truth.properties.pollId, "poll-floor");
  assert.deepEqual(harness.filters.get("report-floor-mismatch-lyr"), [
    "==", ["get", "z"], 1,
  ]);
  assert.deepEqual(harness.filters.get("report-floor-mismatch-reported-lyr"), [
    "==", ["get", "z"], 1,
  ]);
  floor = 2;
  layer.applyFloor();
  assert.deepEqual(harness.filters.get("report-floor-mismatch-lyr"), [
    "==", ["get", "z"], 2,
  ]);
  assert.deepEqual(
    harness.filters.get("report-floor-mismatch-reported-lyr"),
    ["==", ["get", "z"], 2],
  );
  const truthPaint = harness.layers.get("report-floor-mismatch-lyr").paint;
  const reportedPaint = harness.layers
    .get("report-floor-mismatch-reported-lyr").paint;
  assert.notEqual(truthPaint["circle-color"], reportedPaint["circle-color"]);
  assert.notEqual(
    truthPaint["circle-stroke-width"],
    reportedPaint["circle-stroke-width"],
  );
  assert.deepEqual(layer.sourceIds, [
    "report-floor-mismatch",
    "report-floor-mismatch-reported",
  ]);
});

test("legacy warning evidence draws truth without inventing a reported endpoint", () => {
  const harness = mapHarness();
  const layer = createReportWarningMapLayer(harness.map, () => 1);
  assert.equal(layer.draw({
    points: [{
      lat: -45.8701,
      lng: 170.5001,
      z: 1,
      reportedZ: 2,
      pollId: "poll-floor",
      weightSeconds: 2,
    }],
  }), 1);
  const truth = harness.sources.get("report-floor-mismatch").data.features;
  const reported = harness.sources
    .get("report-floor-mismatch-reported").data.features;
  assert.equal(truth.length, 1);
  assert.equal(truth[0].properties.endpoint, "ground-truth");
  assert.deepEqual(reported, []);
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
