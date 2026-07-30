// FEATURE:      Dynamic room-survey route value tests
// SURFACE:      node:test coverage for queued stops and provider geometry
// WHY TOGETHER: Clone, identity, and numeric validation protect the route-queue boundary.
// STATE:        None
// RULES:        Invalid provider values are rejected rather than converted into direct legs.
// PROVENANCE:   Dynamic room-survey Runner request

import assert from "node:assert/strict";
import test from "node:test";
import {
  sameDynamicRoutePair,
  validatedDynamicGeometry,
  validatedDynamicStops,
} from "./dynamic-route-author-values.mjs";

const a = { id: "a", lng: 1, lat: 2, z: 3 };
const b = { id: "b", lng: 4, lat: 5, z: 6 };

test("validated stops are cloned, unique, and reusable only as the same pair", () => {
  const source = structuredClone([a, b]);
  const stops = validatedDynamicStops(source);
  source[0].lng = 99;
  assert.equal(stops[0].lng, 1);
  assert.equal(sameDynamicRoutePair({ from: stops[0], to: stops[1] }, a, b), true);
  assert.equal(sameDynamicRoutePair({ from: stops[0], to: stops[1] }, a, a), false);
  assert.throws(
    () => validatedDynamicStops([a, { ...b, id: "a" }]),
    /must be unique/,
  );
});

test("provider geometry requires two complete numeric points", () => {
  assert.deepEqual(validatedDynamicGeometry([a, b]), [
    { lng: 1, lat: 2, z: 3 },
    { lng: 4, lat: 5, z: 6 },
  ]);
  assert.throws(() => validatedDynamicGeometry([a]), /at least two/);
  assert.throws(
    () => validatedDynamicGeometry([a, { lng: 2, lat: 3 }]),
    /finite numbers/,
  );
});
