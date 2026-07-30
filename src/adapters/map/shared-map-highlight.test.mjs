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
