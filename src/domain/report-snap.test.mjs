// FEATURE:      Report Player snap tester
// SURFACE:      Node tests for report-snap.mjs
// WHY TOGETHER: Radius, active interval, floor, and raw immutability define one tester.
// STATE:        Deterministic turning fixture
// RULES:        Candidate output never mutates or substitutes the captured raw fix.
// PROVENANCE:   Scope/steps/05a_recast_player.md snap tester acceptance

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { buildGroundTruthModel } from "./report-ground-truth.mjs";
import { snapFixToActiveRoute } from "./report-snap.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/route-turns.fixture.v3.json", import.meta.url),
));
const truth = buildGroundTruthModel(fixture);
const walker = truth.at("2026-07-28T01:00:07.000Z");

test("same-floor candidate is accepted or rejected by adjustable radius", () => {
  const rawFix = {
    lng: 0.0005,
    lat: 0.00005,
    z: 0,
    fixTime: "2026-07-28T01:00:07.000Z",
    confidence: 0.8,
  };
  const before = structuredClone(rawFix);
  const accepted = snapFixToActiveRoute(rawFix, walker, 10);
  assert.equal(accepted.rawFix, rawFix);
  assert.deepEqual(rawFix, before);
  assert.equal(accepted.status, "accepted");
  assert.equal(accepted.candidate.z, 0);
  assert.ok(accepted.measuredDistanceM > 5);
  const rejected = snapFixToActiveRoute(rawFix, walker, 1);
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.reason, "outside-radius");
  assert.deepEqual(rejected.candidate, accepted.candidate);
});

test("candidate stays on active interval and never falls back to another floor", () => {
  const beyondActive = snapFixToActiveRoute(
    { lng: 0.0018, lat: 0.001, z: 0 },
    walker,
    200,
  );
  assert.equal(beyondActive.candidate.activeLegId, "leg-turn");
  const wrongFloor = snapFixToActiveRoute(
    { lng: 0.0005, lat: 0, z: 1 },
    walker,
    200,
  );
  assert.equal(wrongFloor.accepted, false);
  assert.equal(wrongFloor.candidate, null);
  assert.equal(wrongFloor.reason, "no-same-floor-active-route");
});

test("invalid radius and raw coordinates are rejected", () => {
  assert.throws(
    () => snapFixToActiveRoute({ lng: 0, lat: 0, z: 0 }, walker, -1),
    /radiusM/,
  );
  assert.throws(
    () => snapFixToActiveRoute({ lng: 0, lat: "bad", z: 0 }, walker, 10),
    /rawFix/,
  );
});
