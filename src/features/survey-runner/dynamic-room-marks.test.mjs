// FEATURE:      Dynamic room spacing-mark planning tests
// SURFACE:      planStagedLegMarks spacing, endpoint-gap, and short-leg coverage
// WHY TOGETHER: Mark positions must mirror the planned intermediate generator.
// STATE:        Straight corridor geometry from a stubbed route provider
// RULES:        Spacing zero never routes; short legs produce no marks.
// PROVENANCE:   Structured dynamic capture request

import assert from "node:assert/strict";
import test from "node:test";
import { haversine } from "../../domain/geometry.mjs";
import { planStagedLegMarks } from "./dynamic-room-marks.mjs";

const FROM = { id: "stop-1", lng: 170.5085, lat: -45.8724, z: 1 };
const TARGET = { lng: 170.5085, lat: -45.8722, z: 1, name: "Room B" };

test("a 22 m corridor leg yields 5 m marks clear of both endpoints", async () => {
  const calls = [];
  const plan = await planStagedLegMarks({
    fromStop: FROM,
    target: TARGET,
    spacingM: 5,
    legIndex: 0,
    routeBetween(from, to) {
      calls.push([from, to]);
      return [
        { lng: from.lng, lat: from.lat, z: from.z },
        { lng: to.lng, lat: to.lat, z: to.z },
      ];
    },
  });
  assert.equal(plan.legId, "leg-1");
  assert.equal(calls.length, 1);
  assert.equal("name" in calls[0][1], false);
  assert.deepEqual(plan.geometry, [
    { lng: FROM.lng, lat: FROM.lat, z: 1 },
    { lng: TARGET.lng, lat: TARGET.lat, z: 1 },
  ]);
  assert.equal(plan.marks.length, 2);
  for (const [index, mark] of plan.marks.entries()) {
    assert.equal(mark.legId, "leg-1");
    assert.equal(mark.spacingBasisM, 5);
    assert.equal(mark.z, 1);
    const distance = haversine(FROM, mark);
    assert.ok(Math.abs(distance - (10 + index * 5)) < 0.5, `mark ${index} at ${distance}`);
  }
});

test("spacing zero returns no marks without routing", async () => {
  const plan = await planStagedLegMarks({
    fromStop: FROM,
    target: TARGET,
    spacingM: 0,
    legIndex: 1,
    routeBetween() {
      throw new Error("must not route");
    },
  });
  assert.deepEqual(plan, { legId: "leg-2", marks: [], geometry: [] });
});

test("short legs produce no marks and bad indexes are rejected", async () => {
  const near = { lng: FROM.lng, lat: FROM.lat - 0.00005, z: 1 };
  const plan = await planStagedLegMarks({
    fromStop: FROM,
    target: near,
    spacingM: 5,
    legIndex: 0,
    routeBetween: (from, to) => [from, to],
  });
  assert.deepEqual(plan.marks, []);
  await assert.rejects(
    () => planStagedLegMarks({
      fromStop: FROM, target: TARGET, spacingM: 5, legIndex: -1,
      routeBetween: (from, to) => [from, to],
    }),
    /legIndex/,
  );
});
