// FEATURE:      MazeMap GeoJSON feature construction
// SURFACE:      Empty collection, exact floor-aware path, and recent-fix tests
// WHY TOGETHER: These assertions protect the provider-neutral source feature contract.
// STATE:        None
// RULES:        Floor changes retain their exact connecting segment without canvas projection.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic-truth acceptance

import test from "node:test";
import assert from "node:assert/strict";

import {
  appendPathFeatures,
  emptyFC,
  recentSourceFixes,
} from "./features.mjs";

test("emptyFC returns an independent empty GeoJSON collection", () => {
  const first = emptyFC();
  const second = emptyFC();
  assert.deepEqual(first, { type: "FeatureCollection", features: [] });
  assert.notEqual(first, second);
  assert.notEqual(first.features, second.features);
});

test("appendPathFeatures splits lines by z-level without bridging floors", () => {
  const features = [];
  appendPathFeatures(features, [
    { lng: 170.0, lat: -45.0, z: 1 },
    { lng: 170.1, lat: -45.1, z: 1 },
    { lng: 170.2, lat: -45.2, z: 2 },
    { lng: 170.3, lat: -45.3, z: 2 },
  ], { legIdx: 7 });

  assert.deepEqual(features, [
    {
      type: "Feature",
      properties: { legIdx: 7, z: 1 },
      geometry: {
        type: "LineString",
        coordinates: [[170.0, -45.0], [170.1, -45.1]],
      },
    },
    {
      type: "Feature",
      properties: { legIdx: 7, toZ: 2, z: 1 },
      geometry: {
        type: "LineString",
        coordinates: [[170.1, -45.1], [170.2, -45.2]],
      },
    },
    {
      type: "Feature",
      properties: { legIdx: 7, z: 2 },
      geometry: {
        type: "LineString",
        coordinates: [[170.2, -45.2], [170.3, -45.3]],
      },
    },
  ]);

  appendPathFeatures(features, [{ lng: 1, lat: 2, z: 1 }], {});
  assert.equal(features.length, 3);
});

test("recentSourceFixes filters unusable samples and keeps latest order", () => {
  const samples = [
    { id: 1, source: "cloud", ok: true, data: { latitude: 1 } },
    { id: 2, source: "cloud", ok: false, data: { latitude: 2 } },
    { id: 3, source: "lipi", ok: true, data: { latitude: 3 } },
    { id: 4, source: "cloud", ok: true, data: null },
    { id: 5, source: "cloud", ok: true, data: { latitude: 5 } },
    { id: 6, source: "cloud", ok: true, data: { latitude: 6 } },
  ];

  assert.deepEqual(
    recentSourceFixes(samples, "cloud", 2).map(sample => sample.id),
    [5, 6],
  );
  assert.deepEqual(
    recentSourceFixes(samples, "lipi", 10).map(sample => sample.id),
    [3],
  );
  assert.deepEqual(recentSourceFixes(samples, "cloud", 0), []);
});
