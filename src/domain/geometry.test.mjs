import assert from "node:assert/strict";
import test from "node:test";

import {
  bearing,
  haversine,
  lerp,
  pathLength,
} from "./geometry.mjs";

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected} by more than ${tolerance}`,
  );
};

test("haversine matches a known one-degree equatorial distance", () => {
  const origin = { lat: 0, lng: 0 };
  const oneDegreeEast = { lat: 0, lng: 1 };
  closeTo(haversine(origin, oneDegreeEast), 111_194.92664455874, 1e-6);
  assert.equal(haversine(origin, origin), 0);
});

test("bearing reports cardinal headings", () => {
  closeTo(bearing({ lat: 0, lng: 0 }, { lat: 1, lng: 0 }), 0);
  closeTo(bearing({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }), 90);
  closeTo(bearing({ lat: 0, lng: 0 }, { lat: -1, lng: 0 }), 180);
  closeTo(bearing({ lat: 0, lng: 0 }, { lat: 0, lng: -1 }), 270);
});

test("lerp interpolates coordinates and retains the starting floor", () => {
  assert.deepEqual(
    lerp(
      { lng: 10, lat: 20, z: 3 },
      { lng: 14, lat: 28, z: 4 },
      0.25,
    ),
    { lng: 11, lat: 22, z: 3 },
  );
});

test("pathLength sums consecutive haversine segments", () => {
  const points = [
    { lat: 0, lng: 0 },
    { lat: 0, lng: 1 },
    { lat: 1, lng: 1 },
  ];
  closeTo(
    pathLength(points),
    haversine(points[0], points[1]) + haversine(points[1], points[2]),
  );
  assert.equal(pathLength([]), 0);
  assert.equal(pathLength(points.slice(0, 1)), 0);
});
