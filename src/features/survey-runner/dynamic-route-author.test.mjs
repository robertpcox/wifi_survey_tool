// FEATURE:      Dynamic room-survey route authoring tests
// SURFACE:      node:test coverage for createDynamicRouteAuthor()
// WHY TOGETHER: Ordered completion, retry, and revision rejection are one queue contract.
// STATE:        Deterministic provider promises and route snapshots per test
// RULES:        A failed or stale provider response can never become exported geometry.
// PROVENANCE:   Dynamic room-survey Runner request

import assert from "node:assert/strict";
import test from "node:test";
import { createDynamicRouteAuthor } from "./dynamic-route-author.mjs";

const stop = (id, lng) => ({
  id,
  name: `Room ${id}`,
  lng,
  lat: -45.87,
  z: 1,
  poiId: null,
  poiName: null,
  locationType: "room",
  provenance: { method: "map" },
});
const geometry = (from, to) => [
  { lng: from.lng, lat: from.lat, z: from.z },
  { lng: to.lng, lat: to.lat, z: to.z },
];
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((pass, fail) => {
    resolve = pass;
    reject = fail;
  });
  return { promise, reject, resolve };
};
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

test("committed stops route sequentially and finalise in authored order", async () => {
  const calls = [];
  const controls = [];
  const author = createDynamicRouteAuthor({
    routeBetween(from, to) {
      calls.push(`${from.id}-${to.id}`);
      const control = deferred();
      controls.push(control);
      return control.promise;
    },
  });
  const [a, b, c] = [stop("a", 170.50), stop("b", 170.51), stop("c", 170.52)];
  author.commitStop(a);
  author.commitStop(b);
  author.commitStop(c);
  assert.deepEqual(calls, ["a-b"]);
  assert.deepEqual(author.snapshot(), {
    revision: 3,
    status: "routing",
    stopCount: 3,
    legCount: 0,
    pendingCount: 2,
    failedCount: 0,
    failures: [],
  });
  controls[0].resolve(geometry(a, b));
  await nextTurn();
  assert.deepEqual(calls, ["a-b", "b-c"]);
  const finalising = author.finalise();
  controls[1].resolve(geometry(b, c));
  const plan = await finalising;
  assert.equal(plan.revision, 3);
  assert.deepEqual(plan.legs.map(leg => [
    leg.fromStopId,
    leg.toStopId,
  ]), [["a", "b"], ["b", "c"]]);
});

test("failure stays visible until an explicit retry succeeds", async () => {
  let attempts = 0;
  const author = createDynamicRouteAuthor({
    async routeBetween(from, to) {
      attempts++;
      if (attempts === 1) throw new Error("routing offline");
      return geometry(from, to);
    },
  });
  author.commitStop(stop("a", 1));
  author.commitStop(stop("b", 2));
  await assert.rejects(author.finalise(), /a → b: routing offline/);
  assert.equal(author.snapshot().status, "failed");
  assert.equal(author.snapshot().failedCount, 1);
  const plan = await author.finalise({ retryFailed: true });
  assert.equal(attempts, 2);
  assert.equal(plan.legs.length, 1);
});

test("a topology revision discards its stale in-flight response", async () => {
  const controls = [];
  const calls = [];
  const author = createDynamicRouteAuthor({
    routeBetween(from, to) {
      calls.push(`${from.id}-${to.id}`);
      const control = deferred();
      controls.push(control);
      return control.promise;
    },
  });
  const a = stop("a", 1);
  const b = stop("b", 2);
  const c = stop("c", 3);
  author.reviseStops([a, b]);
  const staleFinalise = author.finalise();
  author.reviseStops([a, c]);
  await assert.rejects(staleFinalise, /changed while finalising/);
  assert.deepEqual(calls, ["a-b", "a-c"]);
  controls[1].resolve(geometry(a, c));
  const plan = await author.finalise();
  controls[0].resolve(geometry(a, b));
  await nextTurn();
  assert.equal(plan.revision, 2);
  assert.equal(plan.legs[0].toStopId, "c");
  assert.deepEqual(plan.legs[0].geometry, geometry(a, c));
});
