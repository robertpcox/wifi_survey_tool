import assert from "node:assert/strict";
import test from "node:test";

import {
  createPreviewProjection,
  distinctPreviewLevels,
} from "./preview-projection.mjs";

test("preview projection ranks numeric levels and ignores invalid values", () => {
  assert.deepEqual(distinctPreviewLevels([
    { z: "9" },
    { z: -4 },
    { z: 9 },
    { z: "missing" },
    {},
  ]), [-4, 9]);
  assert.deepEqual(distinctPreviewLevels([{}, { z: null }]), [0]);
});

test("a higher adjacent level projects exactly up and right", () => {
  const points = [
    { lng: 170.5, lat: -45.87, z: -4 },
    { lng: 170.5, lat: -45.87, z: 9 },
  ];
  const projection = createPreviewProjection(points, [-4, 9]);
  const low = projection.point(points[0]);
  const high = projection.point(points[1]);
  assert.equal(round(high[0] - low[0]), 14);
  assert.equal(round(high[1] - low[1]), -24);

  const lowPlane = projection.plane(-4)[0];
  const highPlane = projection.plane(9)[0];
  assert.equal(round(highPlane[0] - lowPlane[0]), 14);
  assert.equal(round(highPlane[1] - lowPlane[1]), -24);
});

test("a large level stack stays within the reserved projection budget", () => {
  const levels = Array.from({ length: 11 }, (_, index) => index);
  const point = { lng: 1, lat: 2 };
  const projection = createPreviewProjection([point], levels);
  const low = projection.point({ ...point, z: 0 });
  const high = projection.point({ ...point, z: 10 });
  assert.equal(round(high[0] - low[0]), 56);
  assert.equal(round(high[1] - low[1]), -96);
  for (const coordinate of [...low, ...high]) {
    assert.ok(coordinate >= 28);
  }
  assert.ok(low[0] <= 572 && high[0] <= 572);
  assert.ok(low[1] <= 332 && high[1] <= 332);
});

function round(value) {
  return Math.round(value * 10) / 10;
}
