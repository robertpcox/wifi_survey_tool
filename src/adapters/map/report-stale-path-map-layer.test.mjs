// FEATURE:      Report no-position-update walked-path overlay
// SURFACE:      Exact stale-route GeoJSON, styling, and native-floor filtering tests
// WHY TOGETHER: One fake map proves bends, evidence metadata, and persistent floor behavior.
// STATE:        In-memory source, layer, filter, and visibility calls
// RULES:        The adapter never straightens or joins domain-provided route slices.
// PROVENANCE:   NDH field-report "where it gets stuck" feedback

import assert from "node:assert/strict";
import test from "node:test";

import { createReportStalePathMapLayer } from "./report-stale-path-map-layer.mjs";

test("stale path keeps exact route bends, evidence properties, and native z", () => {
  const harness = mapHarness();
  let floor = 2;
  const layer = createReportStalePathMapLayer(harness.map, () => floor);
  const segment = {
    z: 2,
    coordinates: [
      [170.50844053963183, -45.872430093656234],
      [170.5085, -45.87248],
      [170.50861, -45.87252],
    ],
    startedAt: "2026-07-30T01:08:53.826Z",
    endedAt: "2026-07-30T01:09:02.826Z",
    durationSeconds: 9,
    startDistanceM: 120.125,
    endDistanceM: 137.875,
    pollId: "poll-stale",
    fixAgeStartSeconds: 15,
    fixAgeEndSeconds: 24,
    legId: "leg-b-c",
    legIndex: 1,
  };

  assert.equal(layer.draw({ stalePathSegments: [segment] }), 1);
  const [feature] = harness.sources.get("report-stale-path").data.features;
  assert.deepEqual(feature.geometry, {
    type: "LineString",
    coordinates: segment.coordinates,
  });
  assert.deepEqual(feature.properties, {
    z: 2,
    startedAt: segment.startedAt,
    endedAt: segment.endedAt,
    durationSeconds: 9,
    startDistanceM: 120.125,
    endDistanceM: 137.875,
    pollId: "poll-stale",
    fixAgeStartSeconds: 15,
    fixAgeEndSeconds: 24,
    legId: "leg-b-c",
    legIndex: 1,
  });
  assert.deepEqual(harness.filters.get("report-stale-path-lyr"), [
    "==", ["get", "z"], 2,
  ]);

  floor = 3;
  layer.applyFloor();
  assert.deepEqual(harness.filters.get("report-stale-path-lyr"), [
    "==", ["get", "z"], 3,
  ]);
  assert.deepEqual(layer.sourceIds, ["report-stale-path"]);

  const definition = harness.layers.get("report-stale-path-lyr");
  assert.deepEqual(definition.layout, {
    "line-cap": "round",
    "line-join": "round",
  });
  assert.equal(definition.paint["line-color"], "#ef4444");
  assert.equal(definition.paint["line-width"], 7);
  assert.equal(definition.paint["line-opacity"], 0.72);
});

test("stale path accepts direct segments, clears for heat points, and rejects bad lines", () => {
  const harness = mapHarness();
  const layer = createReportStalePathMapLayer(harness.map, () => 0);
  assert.equal(layer.draw([{
    z: 0,
    coordinates: [[170.1, -45.1], [170.2, -45.2]],
    pollId: "direct",
  }]), 1);
  assert.equal(layer.draw([
    { lng: 170.1, lat: -45.1, z: 0, weightSeconds: 2 },
  ]), 0);
  assert.deepEqual(
    harness.sources.get("report-stale-path").data.features,
    [],
  );
  assert.throws(
    () => layer.draw([{ z: 0, coordinates: [[170.1, -45.1]] }]),
    /at least two finite coordinates/,
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
