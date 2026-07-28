// FEATURE:      Report Player route truth
// SURFACE:      Node tests for report-route.mjs
// WHY TOGETHER: Cumulative construction and leg slicing prove the public route model.
// STATE:        Deterministic turning fixture
// RULES:        Tests retain exact authored coordinates and omit invented inter-leg chords.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic truth acceptance

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { haversine } from "./geometry.mjs";
import { buildReportRoute } from "./report-route.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/route-turns.fixture.v3.json", import.meta.url),
));

test("route model accumulates exact leg geometry and identifies the active leg", () => {
  const route = buildReportRoute(fixture.route);
  const expected = fixture.route.legs.flatMap(leg => (
    leg.geometry.slice(1).map((point, index) => (
      haversine(leg.geometry[index], point)
    ))
  )).reduce((total, distanceM) => total + distanceM, 0);
  assert.ok(Math.abs(route.totalDistanceM - expected) < 1e-9);
  const corner = route.pointAt(route.legs[0].endDistanceM / 2);
  assert.ok(Math.abs(corner.lng - 0.001) < 1e-12);
  assert.ok(Math.abs(corner.lat) < 1e-12);
  assert.equal(corner.activeLegId, "leg-turn");
});

test("route interval follows authored segments without bridging separate legs", () => {
  const route = buildReportRoute(fixture.route);
  const interval = route.interval(0, route.totalDistanceM);
  assert.deepEqual(
    interval.segments.map(segment => [segment.legId, segment.z]),
    [
      ["leg-turn", 0],
      ["leg-turn", 0],
      ["leg-floor", 0],
      ["leg-floor", 1],
    ],
  );
  assert.deepEqual(interval.segments[1].coordinates.at(-1), [0.001, 0.001]);
  assert.deepEqual(interval.segments[3].coordinates[0], [0.001, 0.001]);
});

test("route construction rejects missing embedded geometry", () => {
  assert.throws(
    () => buildReportRoute({ legs: [{ id: "missing", geometry: [] }] }),
    /must contain at least 2 points/,
  );
});
