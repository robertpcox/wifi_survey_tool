// FEATURE:      Shared map GeoJSON construction
// SURFACE:      Exact point, floor-split path, and metre-circle tests
// WHY TOGETHER: Geometry assertions protect the shared geographic coordinate boundary.
// STATE:        None
// RULES:        No output may contain canvas x/y normalization.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic-truth acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { geoCircle, geoPath, geoPoint } from "./map-geojson.mjs";

test("point and path keep exact [lng, lat] and split at z-level changes", () => {
  const point = geoPoint({ lng: 170.123456, lat: -45.654321, z: 0 }, { role: "raw" });
  assert.deepEqual(point.geometry.coordinates, [170.123456, -45.654321]);
  assert.equal("x" in point.geometry, false);
  const paths = geoPath([
    { lng: 170.1, lat: -45.1, z: 0 },
    { lng: 170.2, lat: -45.2, z: 0 },
    { lng: 170.3, lat: -45.3, z: 1 },
    { lng: 170.4, lat: -45.4, z: 1 },
  ], { pairId: "poll-1" }, "poll-1");
  assert.deepEqual(paths.map(feature => feature.geometry.coordinates), [
    [[170.1, -45.1], [170.2, -45.2]],
    [[170.2, -45.2], [170.3, -45.3]],
    [[170.3, -45.3], [170.4, -45.4]],
  ]);
  assert.deepEqual(paths.map(feature => feature.properties.z), [0, 0, 1]);
  assert.equal(paths[1].properties.toZ, 1);
});

test("circle is a closed geographic polygon carrying its exact radius", () => {
  const circle = geoCircle(
    { lng: 170.5, lat: -45.8, z: 2 },
    15,
    { accepted: false },
    "snap-radius",
  );
  assert.equal(circle.geometry.type, "Polygon");
  assert.equal(circle.geometry.coordinates[0].length, 33);
  assert.deepEqual(
    circle.geometry.coordinates[0][0],
    circle.geometry.coordinates[0].at(-1),
  );
  assert.equal(circle.properties.radiusM, 15);
  assert.equal(circle.properties.z, 2);
});
