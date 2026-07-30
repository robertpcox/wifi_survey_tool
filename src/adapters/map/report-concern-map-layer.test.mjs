// FEATURE:      Report areas-of-concern overlay
// SURFACE:      Concern GeoJSON sources, styling, floor filtering, and tap interaction tests
// WHY TOGETHER: One fake map proves direction paint, hot centre, and per-segment tap detail.
// STATE:        In-memory source, layer, filter, and event-handler calls
// RULES:        Each concern kind keeps its own paint; taps emit the segment's numbers.
// PROVENANCE:   NDH areas-of-concern map surface · left/centre/right corridor reading

import assert from "node:assert/strict";
import test from "node:test";

import { createReportConcernMapLayer } from "./report-concern-map-layer.mjs";

function segment(kind, overrides = {}) {
  return {
    kind,
    direction: kind === "centre" ? "both" : "forward",
    pairId: `concern:${kind}:5`,
    z: 1,
    coordinates: [[170.5, -45.87], [170.5004, -45.87]],
    binStartM: 5,
    binEndM: 10,
    binDistanceM: 7.5,
    forwardLockSeconds: 4,
    reverseLockSeconds: 3.5,
    lockSeconds: 7.5,
    ...overrides,
  };
}

test("concern kinds land in their own styled sources with native z filters", () => {
  const harness = mapHarness();
  const layer = createReportConcernMapLayer(harness.map, () => 1);
  const count = layer.draw({ concernSegments: [
    segment("centre"),
    segment("approach-forward", { binStartM: 0, pairId: "concern:approach-forward:0" }),
    segment("approach-reverse", { direction: "reverse" }),
    segment("rf-suspect"),
  ] });
  assert.equal(count, 4);
  const centre = harness.sources.get("report-concern-dead").data.features[0];
  assert.equal(centre.properties.pairId, "concern:centre:5");
  assert.equal(centre.properties.forwardLockSeconds, 4);
  assert.deepEqual(centre.geometry.type, "LineString");
  assert.equal(
    harness.sources.get("report-concern-fwd").data.features[0].properties.binStartM,
    0,
  );
  assert.equal(harness.sources.get("report-concern-rev").data.features.length, 1);
  assert.equal(harness.sources.get("report-concern-rf").data.features.length, 1);
  assert.equal(harness.layers.get("report-concern-dead-lyr").paint["line-width"], 10);
  assert.deepEqual(
    harness.layers.get("report-concern-fwd-lyr").paint["line-dasharray"],
    [2.4, 1.2],
  );
  assert.deepEqual(
    harness.filters.get("report-concern-dead-lyr"),
    ["==", ["get", "z"], 1],
  );
  assert.equal(layer.draw({}), 0);
  assert.throws(
    () => layer.draw([segment("centre", { coordinates: [[170.5, -45.87]] })]),
    /at least two finite coordinates/,
  );
});

test("tapping a concern segment emits its direction and lock numbers", () => {
  const harness = mapHarness();
  const layer = createReportConcernMapLayer(harness.map, () => 1);
  const selections = [];
  layer.onEvidenceSelect(selection => selections.push(selection));
  const handler = harness.handlers.get("click:report-concern-dead-lyr");
  handler({ features: [{ properties: segmentProperties() }] });
  assert.equal(selections.length, 1);
  assert.equal(selections[0].pairId, "concern:centre:5");
  assert.equal(selections[0].properties.direction, "both");
  assert.equal(selections[0].properties.reverseLockSeconds, 3.5);
});

function segmentProperties() {
  const { coordinates, ...properties } = segment("centre", { direction: "both" });
  return properties;
}

function mapHarness() {
  const harness = {
    filters: new Map(), handlers: new Map(), layers: new Map(), sources: new Map(),
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
    on: (name, layerId, handler) => harness.handlers.set(`${name}:${layerId}`, handler),
    setFilter: (id, filter) => harness.filters.set(id, filter),
    setLayoutProperty() {},
  };
  return harness;
}
