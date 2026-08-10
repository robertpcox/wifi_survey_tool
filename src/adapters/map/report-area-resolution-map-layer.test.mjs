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
test("corridor layer retains raw fixes without dashed-line spaghetti", () => {
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
    primary: {
      status: "wrong-room", point: { lng: 170.6, lat: -45.8, z: 2 },
      room: { id: "other-room", name: "Other room" },
    },
  }] }), 2);
  const truth = features(harness, "report-area-resolution-truth");
  const cisco = features(harness, "report-area-resolution-cisco");
  const drift = features(harness, "report-area-resolution-drift");
  assert.deepEqual(truth.map(item => item.properties.verdict), ["inside", "outside"]);
  assert.deepEqual(cisco.map(item => item.properties.verdict), ["inside", "outside"]);
  assert.equal(cisco[1].properties.resolvedAreaName, "Other room");
  assert.deepEqual(cisco.map(item => item.geometry.coordinates), [
    [170.5, -45.8], [170.6, -45.8],
  ]);
  assert.equal(drift.length, 0);
});
test("dwell layer shows one endpoint fix and at most one outside connector", () => {
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
  assert.deepEqual(
    features(harness, "report-area-resolution-truth")
      .map(item => item.properties.verdict),
    ["wrong-floor", "no-position"],
  );
  assert.equal(features(harness, "report-area-resolution-cisco")[0]
    .properties.markerRole, "cisco-position");
  assert.equal(features(harness, "report-area-resolution-drift").length, 0);
});
test("area layer fills complete Polygon and MultiPolygon areas by aggregate severity", () => {
  const harness = mapHarness();
  const layer = createReportAreaResolutionMapLayer(harness.map, () => 2);
  const polygon = { type: "Polygon", coordinates: [[
    [170.5, -45.8], [170.6, -45.8], [170.6, -45.7],
    [170.5, -45.7], [170.5, -45.8],
  ]] };
  const multiPolygon = { type: "MultiPolygon", coordinates: [[[
    [170.7, -45.8], [170.8, -45.8], [170.8, -45.7],
    [170.7, -45.7], [170.7, -45.8],
  ]]] };
  layer.draw({ areaObservations: [], areaPolygons: [{
    areaKey: "poi:clinic:z:2", poiId: "clinic", areaName: "Clinic", z: 2,
    geometry: polygon, severity: "mixed", observationCount: 4,
    scoredSampleCount: 4, insideSampleCount: 3, outsideSampleCount: 1,
    resolutionPercent: 75, runCount: 2,
  }, {
    areaKey: "poi:hall:z:3", poiId: "hall", areaName: "Hall", z: 3,
    geometry: multiPolygon, severity: "bad", observationCount: 2,
    scoredSampleCount: 2, insideSampleCount: 0, outsideSampleCount: 2,
    resolutionPercent: 0, runCount: 1,
  }] });
  const areas = features(harness, "report-area-resolution-area");
  assert.deepEqual(areas.map(item => item.geometry.type), ["Polygon", "MultiPolygon"]);
  assert.deepEqual(areas.map(item => item.properties.severity), ["good", "bad"]);
  assert.deepEqual(areas.map(item => item.properties.z), [2, 3]);
  assert.equal(areas[0].geometry, polygon);
  assert.equal(harness.layers.get("report-area-resolution-area-lyr").type, "fill");
  assert.deepEqual(harness.filters.get("report-area-resolution-area-lyr"),
    ["==", ["get", "z"], 2]);
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
