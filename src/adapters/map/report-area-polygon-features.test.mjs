// FEATURE:      Consolidated MazeMap area polygon presentation
// SURFACE:      node --test src/adapters/map/report-area-polygon-features.test.mjs
// WHY TOGETHER: Continuous resolved percentage and unscored fills share one visual contract.
// STATE:        Synthetic area aggregates
// RULES:        Preserve 0–100%; never turn a partial majority into categorical green.
// PROVENANCE:   Campus area-resolution map

import assert from "node:assert/strict";
import test from "node:test";

import {
  areaPolygonFeatures,
  presentationResolutionPercent,
} from "./report-area-polygon-features.mjs";

test("polygon fill preserves resolved percentage across the full scale", () => {
  assert.equal(presentationResolutionPercent({
    insideSampleCount: 0, outsideSampleCount: 10,
  }), 0);
  assert.equal(presentationResolutionPercent({
    insideSampleCount: 4, outsideSampleCount: 6,
  }), 40);
  assert.equal(presentationResolutionPercent({
    insideSampleCount: 5, outsideSampleCount: 5,
  }), 50);
  assert.equal(presentationResolutionPercent({
    insideSampleCount: 6, outsideSampleCount: 4,
  }), 60);
  assert.equal(presentationResolutionPercent({
    insideSampleCount: 10, outsideSampleCount: 0,
  }), 100);
});

test("polygon feature marks only genuinely unscored areas grey", () => {
  const geometry = { type: "Polygon", coordinates: [] };
  const features = areaPolygonFeatures([{
    geometry, insideSampleCount: 0, outsideSampleCount: 0,
    resolutionPercent: 100, severity: "good",
  }, {
    geometry, scoredSampleCount: 4, resolutionPercent: 62.54,
  }]);
  assert.deepEqual(features.map(item => ({
    resolutionPercent: item.properties.resolutionPercent,
    scored: item.properties.scored,
  })), [{ resolutionPercent: null, scored: false }, {
    resolutionPercent: 62.5, scored: true,
  }]);
});
