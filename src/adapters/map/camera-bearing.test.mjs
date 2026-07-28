// FEATURE:      Direction-up map camera bearing
// SURFACE:      bearingTo(origin, target)
// WHY TOGETHER: Cardinal, coincident, and invalid points define the complete pure calculation.
// STATE:        None
// RULES:        Bearings are degrees clockwise from north; unusable input stays north-up.
// PROVENANCE:   Runner direction-up field feedback

import assert from "node:assert/strict";
import test from "node:test";

import { bearingTo } from "./camera-bearing.mjs";

test("bearingTo reports cardinal directions clockwise from north", () => {
  const origin = { lng: 0, lat: 0 };
  assert.equal(bearingTo(origin, { lng: 0, lat: 1 }), 0);
  assert.equal(bearingTo(origin, { lng: 1, lat: 0 }), 90);
  assert.equal(bearingTo(origin, { lng: 0, lat: -1 }), 180);
  assert.equal(bearingTo(origin, { lng: -1, lat: 0 }), 270);
});

test("bearingTo keeps coincident and unusable points north-up", () => {
  assert.equal(bearingTo({ lng: 1, lat: 2 }, { lng: 1, lat: 2 }), 0);
  assert.equal(bearingTo({ lng: 1, lat: 2 }, { lng: Number.NaN, lat: 3 }), 0);
  assert.equal(bearingTo(null, null), 0);
});
