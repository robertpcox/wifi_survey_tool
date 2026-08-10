// FEATURE:      Report room-resolution loading
// SURFACE:      node --test src/features/report-player/room-resolution-loader.test.mjs
// WHY TOGETHER: Lookup caching, stationary scoring, and unavailable state share one loader.
// STATE:        Dynamic fixture and injected room resolver
// RULES:        No browser, SDK, walking, or snapped coordinate enters this test.
// PROVENANCE:   Dynamic dwell room-resolution evidence

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createRoomResolutionLoader } from "./room-resolution-loader.mjs";

const source = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("loader resolves and scores dynamic stationary visits with cached points", async () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.checkpoints[0].dwellSeconds = 4;
  result.route.checkpoints[2].dwellSeconds = 0;
  const calls = [];
  const loader = createRoomResolutionLoader({
    resolveRoomAt: async (lng, lat, z) => {
      calls.push([lng, lat, z]);
      return {
        id: `room-${z}`,
        name: `Room ${z}`,
        z,
        geometry: { type: "Polygon", coordinates: [[
          [lng - 0.001, lat - 0.001], [lng + 0.001, lat - 0.001],
          [lng + 0.001, lat + 0.001], [lng - 0.001, lat + 0.001],
          [lng - 0.001, lat - 0.001],
        ]] },
      };
    },
  });
  const summary = await loader.load([{ result, exceptions: [] }]);
  assert.equal(loader.status, "ready");
  assert.equal(summary.visitCount, 2);
  assert.equal(summary.resolvedVisitCount, 2);
  assert.equal(summary.corridor.sampleCount, 1);
  assert.equal(summary.corridor.resolvedSampleCount, 1);
  assert.equal(calls.length, 3, "each distinct MazeMap truth point is resolved once");
  await loader.load([{ result, exceptions: [] }]);
  assert.equal(calls.length, 3, "room lookups remain cached across rebuilds");
});

test("missing room resolver is an unavailable evidence state", async () => {
  const loader = createRoomResolutionLoader({});
  const summary = await loader.load([{ result: source, exceptions: [] }]);
  assert.equal(loader.status, "unavailable");
  assert.equal(summary.visitCount, 0);
});

test("captured MazeMap POI identity is authoritative for future runs", async () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.stops[0].poiId = "selected-room";
  result.route.checkpoints[0].dwellSeconds = 0;
  const selected = [];
  const loader = createRoomResolutionLoader({
    resolveRoomById: async (id, z) => {
      selected.push(id);
      const point = result.checkIns[0].groundTruth;
      return room(id, point.lng, point.lat, z);
    },
    resolveRoomAt: async (lng, lat, z) => room("nearby-room", lng, lat, z),
  });
  await loader.load([{ result, exceptions: [] }]);
  assert.deepEqual(selected, ["selected-room"]);
  assert.equal(loader.summary.observations[0].expectedRoom.id, "selected-room");
});

test("outside Cisco points are scored by containment without another POI lookup", async () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.checkpoints[0].dwellSeconds = 4;
  result.polls.find(item => item.id === "poll-3").normalized.lng += 0.01;
  const outside = result.polls.find(item => item.id === "poll-3").normalized;
  let outsideLookups = 0;
  const loader = createRoomResolutionLoader({
    resolveRoomAt: async (lng, lat, z) => {
      if (lng === outside.lng && lat === outside.lat) outsideLookups += 1;
      return room("truth", lng, lat, z);
    },
  });
  const summary = await loader.load([{ result, exceptions: [] }]);
  assert.ok(summary.failedVisitCount > 0);
  assert.equal(summary.observations[0].primary.status, "unresolved");
  assert.equal(outsideLookups, 0);
});

test("an outside Cisco point stays unresolved even when another POI is nearby", async () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.checkpoints[0].dwellSeconds = 4;
  result.polls.find(item => item.id === "poll-3").normalized.lng += 0.01;
  const target = result.checkIns[0].groundTruth;
  const loader = createRoomResolutionLoader({
    resolveRoomAt: async (lng, lat, z) => (
      lng === target.lng && lat === target.lat
        ? room("truth", lng, lat, z)
        : room("closest-not-containing", target.lng, target.lat, z)
    ),
  });
  await loader.load([{ result, exceptions: [] }]);
  assert.equal(loader.summary.observations[0].primary.status, "unresolved");
});

function room(id, lng, lat, z) {
  return { id, name: id, z, geometry: { type: "Polygon", coordinates: [[
    [lng - 0.001, lat - 0.001], [lng + 0.001, lat - 0.001],
    [lng + 0.001, lat + 0.001], [lng - 0.001, lat + 0.001],
    [lng - 0.001, lat - 0.001],
  ]] } };
}
