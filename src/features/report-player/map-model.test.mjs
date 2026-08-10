// FEATURE:      Report Player shared map surface
// SURFACE:      node --test src/features/report-player/map-model.test.mjs
// WHY TOGETHER: Fixture projection assertions prove route, heat, floor, and playback composition.
// STATE:        Parsed report fixture
// RULES:        Floor labels come from meta even when a floor has no observed heat.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createMapFrame } from "./map-model.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("map frame composes embedded route and ground-truth heat by meta floor", () => {
  const noted = structuredClone(result);
  noted.notes = [{
    id: "note-1",
    routeAnchor: {
      type: "checkpoint-interval",
      routeHash: noted.route.hash,
      fromCheckpointId: "checkpoint-a",
      toCheckpointId: "checkpoint-b",
      legId: "leg-a-c",
    },
    groundTruth: { lng: 170.5001, lat: -45.87, z: 0 },
  }];
  const mapFrame = createMapFrame(noted, {
    floor: 0,
    heatKind: "sticky",
    analysis: {
      stalePathSegments: [{
        z: 0,
        coordinates: [
          [170.50005, -45.87],
          [170.5001, -45.86998],
          [170.50015, -45.87],
        ],
      }],
      concernSegments: [
        {
          kind: "centre",
          z: 0,
          coordinates: [[170.5001, -45.87], [170.50015, -45.87]],
        },
        {
          kind: "approach-forward",
          z: 1,
          coordinates: [[170.5002, -45.87], [170.5003, -45.87]],
        },
      ],
      sticky: {
        heatByZ: {
          0: [{ lng: 170.5001, lat: -45.87, z: 0, weightSeconds: 2 }],
        },
      },
    },
    frame: {
      pollTrail: [{ normalized: { lng: 170.5001, lat: -45.87, z: 0 } }],
      walker: { lng: 170.50015, lat: -45.87, z: 0 },
    },
  });
  assert.equal(mapFrame.floorName, "Ground");
  assert.equal(mapFrame.heat[0].weightSeconds, 2);
  assert.deepEqual(
    mapFrame.stalePathLines[0].map(({ lng, lat, z }) => ({ lng, lat, z })),
    [
      { lng: 170.50005, lat: -45.87, z: 0 },
      { lng: 170.5001, lat: -45.86998, z: 0 },
      { lng: 170.50015, lat: -45.87, z: 0 },
    ],
  );
  assert.equal(mapFrame.pollTrail.length, 1);
  assert.equal(mapFrame.concernLines.length, 1);
  assert.equal(mapFrame.concernLines[0].kind, "centre");
  assert.equal(mapFrame.concernLines[0].points.length, 2);
  assert.ok(mapFrame.routeLines.length);
  assert.ok(mapFrame.routeLines[0].at(-1).x - mapFrame.routeLines[0][0].x > 0.5);
  assert.ok(mapFrame.walker);
  assert.equal(mapFrame.notes[0].routeAnchor.toCheckpointId, "checkpoint-b");
  assert.equal(createMapFrame(result, { floor: 1 }).floorName, "First");
  assert.deepEqual(createMapFrame(result, { floor: 1 }).stalePathLines, []);
});

test("overview fallback hides the bootstrap route and fits aggregate evidence", () => {
  const frame = createMapFrame(result, {
    floor: 0,
    heatKind: "room",
    analysis: {
      overview: true,
      fitPoints: [{ lng: 170.6, lat: -45.8, z: 0 }],
      heatmaps: { room: [{ z: 0, points: [{
        lng: 170.6, lat: -45.8, z: 0, weightSeconds: 1,
      }] }] },
    },
  });
  assert.deepEqual(frame.routeLines, []);
  assert.deepEqual(frame.stops, []);
  assert.deepEqual(frame.checkpoints, []);
  assert.equal(frame.heat.length, 1);
});
