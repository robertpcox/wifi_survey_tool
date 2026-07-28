import test from "node:test";
import assert from "node:assert/strict";
import { poiCenter } from "./mazemap-poi-position.mjs";

test("POI centre prefers direct and dedicated point coordinates", () => {
  assert.deepEqual(poiCenter({
    lng: "170.5",
    lat: "-45.8",
    point: { coordinates: [1, 2] },
  }, "3"), { lng: 170.5, lat: -45.8, z: 3 });
  assert.deepEqual(poiCenter({
    point: { coordinates: [170.51, -45.81] },
  }, 4), { lng: 170.51, lat: -45.81, z: 4 });
});

test("POI centre reads point geometry and averages a polygon ring", () => {
  assert.deepEqual(poiCenter({
    geometry: { type: "Point", coordinates: [170.52, -45.82] },
  }, 5), { lng: 170.52, lat: -45.82, z: 5 });
  assert.deepEqual(poiCenter({
    geometry: {
      type: "Polygon",
      coordinates: [[
        [170, -46],
        [172, -46],
        [172, -44],
        [170, -44],
      ]],
    },
  }, 6), { lng: 171, lat: -45, z: 6 });
});

test("POI centre is null when no usable coordinate exists", () => {
  assert.equal(poiCenter(null, 1), null);
  assert.equal(poiCenter({
    geometry: { type: "Point", coordinates: ["bad", -45] },
  }, 1), null);
  assert.equal(poiCenter({ lng: 200, lat: -45 }, 1), null);
  assert.equal(poiCenter({ lng: 170, lat: -45 }, "bad"), null);
});
