// FEATURE:      MazeMap area-resolution map evidence
// SURFACE:      node --test src/adapters/map/report-area-resolution-map-layer.test.mjs
// WHY TOGETHER: Inside/outside points and unsnapped drift connectors prove the map contract.
// STATE:        In-memory map sources
// RULES:        Resolved samples stay green; failures retain both truth and Cisco coordinates.
// PROVENANCE:   Dynamic room and long-corridor area resolution

import assert from "node:assert/strict";
import test from "node:test";

import { createReportAreaResolutionMapLayer }
  from "./report-area-resolution-map-layer.mjs";

test("area layer draws resolved truth and failed unsnapped Cisco drift", () => {
  const harness = mapHarness();
  const layer = createReportAreaResolutionMapLayer(harness.map, () => 2);
  const base = {
    resultId: "run-a", expectedRoom: { name: "Main corridor" },
    observationKind: "corridor-point", settleState: "check-in-only",
  };
  assert.equal(layer.draw({ areaObservations: [{
    ...base, checkpointId: "inside", scored: true, resolved: true,
    target: { lng: 170.5, lat: -45.8, z: 2 },
    primary: { status: "resolved", point: { lng: 170.5, lat: -45.8, z: 2 } },
  }, {
    ...base, checkpointId: "outside", scored: true, resolved: false,
    target: { lng: 170.51, lat: -45.8, z: 2 },
    primary: { status: "wrong-room", point: { lng: 170.6, lat: -45.8, z: 2 } },
  }] }), 2);
  const truth = features(harness, "report-area-resolution-truth");
  const cisco = features(harness, "report-area-resolution-cisco");
  const drift = features(harness, "report-area-resolution-drift");
  assert.deepEqual(truth.map(item => item.properties.verdict), ["inside", "outside"]);
  assert.deepEqual(cisco.map(item => item.properties.verdict), ["inside", "outside"]);
  assert.deepEqual(cisco.map(item => item.geometry.coordinates), [
    [170.5, -45.8], [170.6, -45.8],
  ]);
  assert.deepEqual(drift[0].geometry.coordinates, [
    [170.51, -45.8], [170.6, -45.8],
  ]);
});

test("dwell layer retains outside entry and resolved exit samples", () => {
  const harness = mapHarness();
  const layer = createReportAreaResolutionMapLayer(harness.map, () => 2);
  layer.draw({ areaObservations: [{
    resultId: "run-a", checkpointId: "clinic", observationKind: "dwell",
    expectedRoom: { name: "Clinic" }, resolved: true, scored: true,
    target: { lng: 170.5, lat: -45.8, z: 2 },
    entry: {
      status: "wrong-room", point: { lng: 170.6, lat: -45.8, z: 2 },
    },
    primary: {
      status: "resolved", point: { lng: 170.5, lat: -45.8, z: 2 },
    },
  }] });
  const cisco = features(harness, "report-area-resolution-cisco");
  assert.deepEqual(cisco.map(item => item.properties.phase), ["entry", "exit"]);
  assert.deepEqual(cisco.map(item => item.properties.verdict), ["outside", "inside"]);
  assert.equal(features(harness, "report-area-resolution-drift").length, 1);
});

test("wrong-floor and no-position samples are not labelled outside", () => {
  const harness = mapHarness();
  const layer = createReportAreaResolutionMapLayer(harness.map, () => 2);
  const base = {
    resultId: "run-a", expectedRoom: { name: "Clinic" },
    observationKind: "check-in", scored: true, resolved: false,
    target: { lng: 170.5, lat: -45.8, z: 2 },
  };
  layer.draw({ areaObservations: [{
    ...base, checkpointId: "floor",
    primary: { status: "wrong-floor", point: { lng: 170.5, lat: -45.8, z: 3 } },
  }, {
    ...base, checkpointId: "missing",
    primary: { status: "no-displayed-fix", point: null },
  }] });
  assert.deepEqual(
    features(harness, "report-area-resolution-truth")
      .map(item => item.properties.verdict),
    ["wrong-floor", "no-position"],
  );
  assert.equal(features(harness, "report-area-resolution-cisco")[0]
    .properties.markerRole, "cisco-position");
  assert.equal(features(harness, "report-area-resolution-drift").length, 0);
});

function features(harness, id) {
  return harness.sources.get(id).data.features;
}

function mapHarness() {
  const harness = { layers: new Map(), sources: new Map() };
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
    setFilter() {},
    setLayoutProperty() {},
  };
  return harness;
}
