// FEATURE:      Consolidated zone camera fit
// SURFACE:      node --test src/features/report-player/map-zone-fit.test.mjs
// WHY TOGETHER: Zone bounds must use zone polygons rather than the room alias.
// STATE:        Synthetic room and zone geometries
// RULES:        Only visible zone evidence defines zone-mode bounds.
// PROVENANCE:   MazeMap zone resolution

import assert from "node:assert/strict";
import test from "node:test";

import { routeForMapAnalysis } from "./map-fit-route.mjs";

test("zone fit uses zone geometry instead of the room compatibility alias", () => {
  const zone = routeForMapAnalysis({
    overview: true,
    areaResolution: summary(80),
    areaResolutions: { zone: summary(20) },
  }, { legs: [] }, { floor: 1, heatKind: "zone", overview: true });
  assert.ok(zone.legs[0].geometry.some(point => point.lng === 20));
  assert.ok(!zone.legs[0].geometry.some(point => point.lng === 80));
});

function summary(lng) {
  return { areaPolygons: [{ z: 1, scoredSampleCount: 1,
    resolutionPercent: 100, geometry: { type: "Polygon", coordinates: [[
      [lng, 21], [lng + 2, 21], [lng + 2, 23], [lng, 21],
    ]] } }], areaObservations: [] };
}
