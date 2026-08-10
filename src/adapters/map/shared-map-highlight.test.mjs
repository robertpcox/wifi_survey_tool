// FEATURE:      One shared Report and Player geographic map
// SURFACE:      Selected Report/Player highlight isolation tests
// WHY TOGETHER: Time/distance visibility and hidden Report evidence form one map-highlight contract.
// STATE:        Fake map source data and visibility
// RULES:        Selected heat persists in Player while Report-only notes, fixes, and warnings stay hidden.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import test from "node:test";

import { createSharedMapLayers } from "./shared-map-layers.mjs";

test("selected highlight colours Analysis and Player without leaking report evidence", () => {
  const harness = mapHarness();
  const layers = createSharedMapLayers(harness.map, () => 2);
  const analysis = {
    heatmaps: {
      accuracy: [{
        z: 2,
        points: [{ lng: 170.2, lat: -45.2, z: 2, weightSeconds: 9 }],
      }],
    },
    stalePathSegments: [{
      z: 2,
      coordinates: [[170.2, -45.2], [170.21, -45.21]],
    }],
    timeline: [{
      pollId: "poll-wifi",
      receivedAt: "2026-07-30T01:08:53.826Z",
      fix: { lng: 170.25, lat: -45.25, z: 2 },
      groundTruth: { lng: 170.2, lat: -45.2, z: 2 },
    }],
    warnings: {
      floorMismatch: {
        points: [{
          lng: 170.2, lat: -45.2, z: 2, reportedZ: 1,
          pollId: "poll-floor", weightSeconds: 2,
        }],
      },
    },
    areaResolution: {
      areaObservations: [{
        resultId: "run-area", checkpointId: "clinic", observationKind: "dwell",
        expectedRoom: { name: "Clinic" }, scored: true, resolved: false,
        target: { lng: 170.24, lat: -45.24, z: 2 },
        primary: {
          status: "wrong-room", point: { lng: 170.26, lat: -45.24, z: 2 },
        },
      }],
      areaPolygons: [{
        areaKey: "clinic", areaName: "Clinic", z: 2, severity: "bad",
        geometry: { type: "Polygon", coordinates: [[
          [170.23, -45.25], [170.25, -45.25],
          [170.25, -45.23], [170.23, -45.25],
        ]] },
      }],
    },
  };
  layers.drawReportHeat("accuracy", analysis);
  layers.drawReportNotes([{
    id: "note-accuracy",
    groundTruth: { lng: 170.2, lat: -45.2, z: 2 },
  }]);
  assert.equal(layers.highlightKind, "accuracy");
  assert.equal(harness.visibility.get("report-sticky-heat-lyr"), "none");
  assert.equal(harness.visibility.get("report-accuracy-heat-lyr"), "visible");
  assert.equal(harness.visibility.get("report-stale-path-lyr"), "none");
  assert.equal(harness.visibility.get("report-notes-lyr"), "visible");

  layers.setViewMode("playback");
  assert.equal(harness.visibility.get("report-accuracy-heat-lyr"), "visible");
  assert.equal(harness.visibility.get("report-stale-path-lyr"), "none");
  assert.equal(harness.visibility.get("report-notes-lyr"), "none");
  assert.equal(harness.visibility.get("report-floor-mismatch-lyr"), "none");
  assert.equal(harness.visibility.get("report-wifi-fixes-lyr"), "none");
  assert.equal(harness.visibility.get("player-raw-fix-lyr"), "visible");

  layers.drawReportHeat("sticky", {
    ...analysis,
    heatmaps: {
      sticky: [{
        z: 2,
        points: [{ lng: 170.22, lat: -45.22, z: 2, weightSeconds: 4 }],
      }],
    },
  });
  assert.equal(layers.highlightKind, "sticky");
  assert.equal(harness.visibility.get("report-sticky-heat-lyr"), "visible");
  assert.equal(harness.visibility.get("report-accuracy-heat-lyr"), "none");
  assert.equal(harness.visibility.get("report-stale-path-lyr"), "visible");
  assert.equal(harness.visibility.get("report-notes-lyr"), "none");

  const areaCisco = harness.sources.get("report-area-resolution-cisco")
    .data.features[0];
  assert.deepEqual(areaCisco.geometry.coordinates, [170.26, -45.24]);
  assert.equal(areaCisco.properties.verdict, "outside");
  assert.equal(harness.visibility.get("report-area-resolution-cisco-lyr"), "none");

  layers.setViewMode("analysis");
  layers.drawReportHeat("room", {
    ...analysis, heatmaps: { room: [] },
  });
  assert.equal(harness.visibility.get("report-room-heat-lyr"), "visible");
  assert.equal(harness.sources.get("report-room-heat").data.features.length, 0);
  assert.equal(harness.sources.get("report-area-resolution-area")
    .data.features.length, 1);
  assert.equal(harness.visibility.get("report-area-resolution-area-lyr"), "visible");
  assert.equal(harness.visibility.get("report-area-resolution-cisco-lyr"), "visible");
  assert.equal(harness.visibility.get("report-stale-path-lyr"), "none");

  layers.drawReportHeat("lag", {
    heatmaps: { lag: [{ lng: 170.3, lat: -45.3, z: 2, weight: 18 }] },
  });
  assert.equal(harness.visibility.get("report-lag-heat-lyr"), "visible");
  assert.equal(harness.visibility.get("report-area-resolution-cisco-lyr"), "none");
  assert.equal(harness.visibility.get("report-stale-path-lyr"), "none");

  layers.drawReportHeat("freeze", {
    ...analysis, overview: true, heatmaps: { freeze: [] },
  });
  assert.equal(harness.visibility.get("report-freeze-heat-lyr"), "visible");
  assert.equal(harness.visibility.get("report-stale-path-lyr"), "visible");

  layers.drawReportHeat("sticky", {
    ...analysis, overview: true, heatmaps: { sticky: [] },
  });
  assert.equal(harness.visibility.get("report-sticky-heat-lyr"), "visible");
  assert.equal(harness.visibility.get("report-stale-path-lyr"), "none");
});
function mapHarness() {
  const harness = {
    layers: new Map(), sources: new Map(), visibility: new Map(),
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
    on() {},
    setFeatureState() {},
    setFilter() {},
    setLayoutProperty: (id, _property, value) => harness.visibility.set(id, value),
  };
  return harness;
}
