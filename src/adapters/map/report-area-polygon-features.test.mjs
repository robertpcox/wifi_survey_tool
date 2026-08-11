// FEATURE:      Consolidated MazeMap area polygon presentation
// SURFACE:      node --test src/adapters/map/report-area-polygon-features.test.mjs
// WHY TOGETHER: Continuous scored-area percentages and unscored omission share one contract.
// STATE:        Synthetic area aggregates
// RULES:        Preserve 0–100%, including matched green rooms; omit only unscored areas.
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

test("polygon feature restores fully matched rooms and hides only unscored areas", () => {
  const geometry = { type: "Polygon", coordinates: [] };
  const features = areaPolygonFeatures([{
    geometry, insideSampleCount: 0, outsideSampleCount: 0,
    resolutionPercent: 100, severity: "good",
  }, {
    geometry, insideSampleCount: 4, outsideSampleCount: 0,
    resolutionPercent: 100, severity: "good", identifier: "K02.07",
  }, {
    geometry, scoredSampleCount: 4, resolutionPercent: 62.54,
  }]);
  assert.deepEqual(features.map(item => ({
    resolutionPercent: item.properties.resolutionPercent,
    scored: item.properties.scored,
    identifier: item.properties.identifier,
  })), [
    { resolutionPercent: 100, scored: true, identifier: "K02.07" },
    { resolutionPercent: 62.5, scored: true, identifier: undefined },
  ]);
});
