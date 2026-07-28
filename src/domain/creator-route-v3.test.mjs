import assert from "node:assert/strict";
import test from "node:test";

import {
  SHORT_LEG_THRESHOLD_M,
  createRouteLegV3,
  generateRouteCheckpointsV3,
} from "./creator-route-v3.mjs";

const EARTH_RADIUS_M = 6_371_000;

function pointAt(distanceM, z = 0) {
  return { lng: distanceM / EARTH_RADIUS_M * 180 / Math.PI, lat: 0, z };
}

function routeAt(distanceM) {
  const stops = [
    {
      id: "stop-a", name: "Start", ...pointAt(0), poiId: null,
      locationType: "room", provenance: { method: "map" },
    },
    {
      id: "stop-b", name: "Finish", ...pointAt(distanceM), poiId: null,
      locationType: "room", provenance: { method: "map" },
    },
  ];
  return {
    stops,
    leg: createRouteLegV3(stops[0], stops[1], [
      pointAt(1),
      pointAt(distanceM - 1),
    ], 0),
  };
}

test("short-leg policy has a strict 9.9/10.0/10.1 metre boundary", () => {
  assert.equal(SHORT_LEG_THRESHOLD_M, 10);
  const outcomes = [9.9, 10, 10.1].map(distanceM => {
    const { stops, leg } = routeAt(distanceM);
    const result = generateRouteCheckpointsV3(stops, [leg], 1);
    return {
      distanceM,
      short: result.shortLegs.length === 1,
      intermediate: result.checkpoints.some(item =>
        item.type === "intermediate"),
    };
  });
  assert.deepEqual(outcomes, [
    { distanceM: 9.9, short: true, intermediate: false },
    { distanceM: 10, short: false, intermediate: false },
    { distanceM: 10.1, short: false, intermediate: false },
  ]);
});

test("leg distance, exact endpoints, spacing, and V3 IDs are deterministic", () => {
  const { stops, leg } = routeAt(30);
  assert.deepEqual(leg.geometry[0], pointAt(0));
  assert.deepEqual(leg.geometry.at(-1), pointAt(30));
  assert.ok(Math.abs(leg.distanceM - 30) < 1e-9);
  assert.deepEqual(
    generateRouteCheckpointsV3(stops, [leg], 10).checkpoints,
    [
      {
        id: "checkpoint-1", sequence: 0, type: "stop", ...pointAt(0),
        stopId: "stop-a", legId: null, spacingBasisM: 10,
      },
      {
        id: "checkpoint-2", sequence: 1, type: "intermediate",
        ...pointAt(10), stopId: null, legId: "leg-1", spacingBasisM: 10,
      },
      {
        id: "checkpoint-3", sequence: 2, type: "intermediate",
        ...pointAt(20), stopId: null, legId: "leg-1", spacingBasisM: 10,
      },
      {
        id: "checkpoint-4", sequence: 3, type: "stop", ...pointAt(30),
        stopId: "stop-b", legId: null, spacingBasisM: 10,
      },
    ],
  );
});

test("six-metre endpoint gap removes bunched intermediate checkpoints", () => {
  const { stops, leg } = routeAt(15);
  const result = generateRouteCheckpointsV3(stops, [leg], 10);
  assert.deepEqual(
    result.checkpoints.map(checkpoint => checkpoint.type),
    ["stop", "stop"],
  );
});

test("leg creation rejects missing or incomplete routed geometry", () => {
  const { stops } = routeAt(20);
  for (const geometry of [undefined, [], [pointAt(10)]]) {
    assert.throws(
      () => createRouteLegV3(stops[0], stops[1], geometry, 0),
      /route\.legs\.0\.geometry: must contain at least 2 points/,
    );
  }
});
