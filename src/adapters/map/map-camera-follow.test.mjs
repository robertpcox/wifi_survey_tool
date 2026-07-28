// FEATURE:      Provider-neutral map camera follow
// SURFACE:      Viewport margin, exact camera, and provider fallback tests
// WHY TOGETHER: One fake map proves following pans only when the baseline nears an edge.
// STATE:        Recorded camera calls on a single fake map
// RULES:        Exact walker coordinates enter the camera without changing map identity.
// PROVENANCE:   Scope/steps/05a_recast_player.md Player follow acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { followMapPoint } from "./map-camera-follow.mjs";

test("follow keeps an inset walker still and pans the same map near an edge", () => {
  const cameras = [];
  const map = boundedMap();
  map.easeTo = camera => cameras.push(camera);
  assert.equal(followMapPoint(map, { lng: 170.5, lat: -45.5, z: 0 }), false);
  assert.deepEqual(cameras, []);
  assert.equal(followMapPoint(map, { lng: 170.89, lat: -45.5, z: 0 }), true);
  assert.deepEqual(cameras, [{
    center: [170.89, -45.5],
    duration: 400,
  }]);
});

test("follow rejects invalid points and falls back to flyTo without bounds", () => {
  const cameras = [];
  const map = { flyTo: camera => cameras.push(camera) };
  assert.equal(followMapPoint(map, { lng: "invalid", lat: -45.5 }), false);
  assert.equal(followMapPoint(map, {
    lng: 170.123456,
    lat: -45.654321,
  }, { durationMs: 250 }), true);
  assert.deepEqual(cameras, [{
    center: [170.123456, -45.654321],
    duration: 250,
  }]);
});

function boundedMap() {
  return {
    getBounds: () => ({
      getWest: () => 170,
      getEast: () => 171,
      getSouth: () => -46,
      getNorth: () => -45,
    }),
  };
}
