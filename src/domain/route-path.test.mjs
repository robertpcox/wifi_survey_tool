import assert from "node:assert/strict";
import test from "node:test";

import {
  extractPath,
  routePoint,
  routePointDistance,
  sameRoutePoint,
} from "./route-path.mjs";

test("extractPath joins, orients, floors, deduplicates, and caps a route", () => {
  const geojson = {
    features: [
      {
        properties: { zLevel: "1" },
        geometry: {
          type: "MultiLineString",
          coordinates: [
            [[0.002, 0], [0.001, 0]],
            [[0.002, 0], [0.003, 0]],
          ],
        },
      },
      {
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [[0.003, 0], [0.0035, 0], ["bad", 0]],
        },
      },
    ],
  };
  const path = extractPath(
    geojson,
    { lng: 0, lat: 0, z: 1 },
    { lng: 0.004, lat: 0, z: 1 },
  );
  assert.deepEqual(path, [
    { lng: 0, lat: 0, z: 1 },
    { lng: 0.001, lat: 0, z: 1 },
    { lng: 0.002, lat: 0, z: 1 },
    { lng: 0.003, lat: 0, z: 1 },
    { lng: 0.0035, lat: 0, z: 1 },
    { lng: 0.004, lat: 0, z: 1 },
  ]);
});

test("extractPath returns empty when no usable line exists", () => {
  assert.deepEqual(
    extractPath(
      { features: [{ geometry: { type: "Point", coordinates: [1, 2] } }] },
      { lng: 0, lat: 0, z: 1 },
      { lng: 1, lat: 1, z: 1 },
    ),
    [],
  );
});

test("routePoint coerces all route coordinates to numbers", () => {
  assert.deepEqual(
    routePoint({ lng: "170.5", lat: "-45.8", z: "2" }),
    { lng: 170.5, lat: -45.8, z: 2 },
  );
});

test("sameRoutePoint compares coordinates and numeric floor identity", () => {
  assert.equal(
    sameRoutePoint(
      { lng: 1, lat: 2, z: "3" },
      { lng: 1, lat: 2, z: 3 },
    ),
    true,
  );
  assert.equal(
    sameRoutePoint(
      { lng: 1, lat: 2, z: 3 },
      { lng: 1.001, lat: 2, z: 3 },
    ),
    false,
  );
});

test("routePointDistance adds a kilometre for a known floor change", () => {
  const point = { lng: 1, lat: 2 };
  assert.equal(
    routePointDistance({ ...point, z: 1 }, { ...point, z: 2 }),
    1000,
  );
  assert.equal(
    routePointDistance({ ...point, z: undefined }, { ...point, z: 2 }),
    0,
  );
});
