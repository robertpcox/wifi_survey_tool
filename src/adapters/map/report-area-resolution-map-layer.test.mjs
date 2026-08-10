// FEATURE:      MazeMap area-resolution map evidence
// SURFACE:      node --test src/adapters/map/report-area-resolution-map-layer.test.mjs
// WHY TOGETHER: Failed raw points and paired unsnapped connectors prove the map contract.
// STATE:        In-memory map sources
// RULES:        Only outside/wrong-floor blue dots and their orange truth points are drawn.
// PROVENANCE:   Dynamic room and long-corridor area resolution

import assert from "node:assert/strict";
import test from "node:test";

import { createReportAreaResolutionMapLayer } from "./report-area-resolution-map-layer.mjs";
test("area map hides inside pairs and retains only outside displacement", () => {
  const harness = mapHarness();
  const layer = createReportAreaResolutionMapLayer(harness.map, () => 2);
  const base = {
    resultId: "run-a", expectedRoom: { name: "Main corridor" },
    observationKind: "corridor-point", settleState: "check-in-only",
  };
  assert.equal(layer.draw({ areaObservations: [{
    ...base, checkpointId: "inside", scored: true, resolved: true,
    target: { lng: 170.5, lat: -45.8, z: 2 },
    primary: { status: "resolved", point: { lng: 170.55, lat: -45.8, z: 2 } },
  }, {
    ...base, checkpointId: "outside", scored: true, resolved: false,
    target: { lng: 170.51, lat: -45.8, z: 2 },
    primary: {
      status: "wrong-room", point: { lng: 170.55, lat: -45.8, z: 2 },
      room: { id: "other-room", name: "Other room" },
    },
  }] }), 1);
  const truth = features(harness, "report-area-resolution-truth");
  const cisco = features(harness, "report-area-resolution-cisco");
  const drift = features(harness, "report-area-resolution-drift");
  assert.deepEqual(truth.map(item => item.properties.verdict), ["outside"]);
  assert.deepEqual(cisco.map(item => item.properties.verdict), ["outside"]);
  assert.equal(cisco[0].properties.resolvedAreaName, "Other room");
  assert.deepEqual(cisco[0].geometry.coordinates, [170.55, -45.8]);
  assert.deepEqual(drift.map(item => item.properties.verdict), ["outside"]);
  assert.deepEqual(drift[0].geometry.coordinates,
    [[170.51, -45.8], [170.55, -45.8]]);
  const expectedPaint = harness.layers.get("report-area-resolution-truth-lyr").paint;
  const ciscoPaint = harness.layers.get("report-area-resolution-cisco-lyr").paint;
  const connectorPaint = harness.layers.get("report-area-resolution-drift-lyr").paint;
  assert.equal(expectedPaint["circle-color"], "#f59e0b");
  assert.equal(ciscoPaint["circle-color"], "#2563eb");
  assert.equal(connectorPaint["line-color"], "#2563eb");
  assert.equal(connectorPaint["line-opacity"], 0.48);
});
test("dwell layer pairs its one end-window fix to the expected point", () => {
  const harness = mapHarness();
  const layer = createReportAreaResolutionMapLayer(harness.map, () => 2);
  layer.draw({ areaObservations: [{
    resultId: "run-a", checkpointId: "clinic", observationKind: "dwell",
    expectedRoom: { name: "Clinic" }, resolved: true, scored: true,
    verdictBasis: "time-majority", tied: false,
    windowSeconds: 20, windowComplete: true, windowEndMs: 20_000,
    target: { lng: 170.5, lat: -45.8, z: 2 },
    entry: {
      status: "wrong-room", point: { lng: 170.6, lat: -45.8, z: 2 },
    },
    moments: [
      { status: "wrong-room", point: { lng: 170.6, lat: -45.8, z: 2 } },
      { status: "wrong-room", point: { lng: 170.55, lat: -45.8, z: 2 } },
      { status: "wrong-room", point: { lng: 170.6, lat: -45.8, z: 2 } },
    ],
    primary: {
      status: "resolved", point: { lng: 170.5, lat: -45.8, z: 2 },
    },
    windowExit: {
      status: "wrong-room", point: { lng: 170.6, lat: -45.8, z: 2 },
    },
  }] });
  const cisco = features(harness, "report-area-resolution-cisco");
  assert.equal(cisco.length, 1);
  assert.deepEqual([cisco[0].properties.phase, cisco[0].properties.verdict], ["end-window", "outside"]);
  assert.deepEqual([cisco[0].properties.status, cisco[0].properties.visitStatus], ["wrong-room", "resolved"]);
  assert.equal(cisco[0].properties.representedSampleCount, 3);
  assert.equal(cisco[0].properties.visitVerdict, "inside");
  assert.equal(cisco[0].properties.windowEndMs, 20_000);
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
  const truthVerdicts = features(harness, "report-area-resolution-truth")
    .map(item => item.properties.verdict);
  assert.deepEqual(truthVerdicts, ["wrong-floor"]);
  assert.equal(features(harness, "report-area-resolution-cisco")[0]
    .properties.markerRole, "cisco-position");
  assert.equal(features(harness, "report-area-resolution-drift").length, 0);
});
function features(harness, id) {
  return harness.sources.get(id).data.features;
}
function mapHarness() {
  const harness = { layers: new Map(), sources: new Map(), filters: new Map() };
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
    setLayoutProperty() {},
  };
  return harness;
}
