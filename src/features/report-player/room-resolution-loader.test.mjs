// FEATURE:      Report room-resolution loading
// SURFACE:      node --test src/features/report-player/room-resolution-loader.test.mjs
// WHY TOGETHER: Bulk-catalog matching, stationary scoring, and unavailable state share one loader.
// STATE:        Survey fixture and injected room catalogue
// RULES:        No point resolver, browser, SDK, walking, or snapped coordinate enters this test.
// PROVENANCE:   All-run stop/dwell and corridor evidence

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createRoomResolutionLoader } from "./room-resolution-loader.mjs";

const source = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("loader scores dynamic visits from one cached bulk room catalogue", async () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.checkpoints[0].dwellSeconds = 4;
  result.route.checkpoints[2].dwellSeconds = 0;
  let calls = 0;
  const loader = createRoomResolutionLoader({
    resolveCampusRooms: async points => {
      calls += 1;
      return points.map((point, index) => room(
        `room-${index}`, point.lng, point.lat, point.z,
      ));
    },
  });
  const summary = await loader.load([{ result, exceptions: [] }]);
  assert.equal(loader.status, "ready");
  assert.equal(summary.visitCount, 2);
  assert.equal(summary.resolvedVisitCount, 0, "an exact no-fix/inside tie fails");
  assert.equal(summary.failedVisitCount, 1);
  assert.equal(summary.unscoredVisitCount, 1, "zero dwell is not room evidence");
  assert.equal(summary.corridor.sampleCount, 1);
  assert.equal(summary.corridor.resolvedSampleCount, 1);
  assert.equal(calls, 1, "all building polygons are loaded together");
  await loader.load([{ result, exceptions: [] }]);
  assert.equal(calls, 1, "the successful catalogue remains cached");
});

test("missing room resolver is an unavailable evidence state", async () => {
  const loader = createRoomResolutionLoader({});
  const summary = await loader.load([{ result: source, exceptions: [] }]);
  assert.equal(loader.status, "unavailable");
  assert.equal(summary.visitCount, 0);
});

test("captured POI identity is authoritative within the bulk catalogue", async () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.stops[0].poiId = "selected-room";
  result.route.checkpoints[0].dwellSeconds = 0;
  let pointCalls = 0;
  const loader = createRoomResolutionLoader({
    resolveCampusRooms: async () => {
      const point = result.checkIns[0].groundTruth;
      return [
        room("nearby-room", point.lng, point.lat, point.z),
        room("selected-room", point.lng, point.lat, point.z, 0.0005),
      ];
    },
    resolveRoomAt: async () => { pointCalls += 1; },
    resolveRoomById: async () => { pointCalls += 1; },
  });
  await loader.load([{ result, exceptions: [] }]);
  assert.equal(pointCalls, 0);
  assert.equal(loader.summary.observations[0].expectedRoom.id, "selected-room");
});

test("catalogue misses stay unscored and never fall back to closest-POI calls", async () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.checkpoints.forEach(item => { item.dwellSeconds = 6; });
  result.route.stops[0].poiId = "missing-selected-room";
  let pointCalls = 0;
  const loader = createRoomResolutionLoader({
    resolveCampusRooms: async () => [],
    resolveRoomAt: async () => { pointCalls += 1; throw new Error("forbidden"); },
    resolveRoomById: async () => { pointCalls += 1; throw new Error("forbidden"); },
  });
  const summary = await loader.load([{ result, exceptions: [] }]);
  assert.equal(loader.status, "ready", "an empty catalogue is valid evidence availability");
  assert.equal(pointCalls, 0);
  assert.equal(summary.scoredVisitCount, 0);
  assert.equal(summary.failedVisitCount, 0, "missing truth is not a Cisco failure");
  assert.equal(summary.unscoredVisitCount, summary.visitCount);
  assert.ok(summary.observations.every(item => item.expectedRoom === null));
  assert.ok(summary.observations.every(item => item.primary.status === "truth-unavailable"));
  assert.equal(summary.corridor.scoredSampleCount, 0);
});

test("outside Cisco points are scored locally without a point lookup", async () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.checkpoints[0].dwellSeconds = 6;
  result.polls.find(item => item.id === "poll-3").normalized.lng += 0.01;
  const outside = result.polls.find(item => item.id === "poll-3").normalized;
  let pointCalls = 0;
  const target = result.checkIns[0].groundTruth;
  const loader = createRoomResolutionLoader({
    resolveCampusRooms: async () => [room("truth", target.lng, target.lat, target.z)],
    resolveRoomAt: async () => { pointCalls += 1; },
  });
  const summary = await loader.load([{ result, exceptions: [] }]);
  assert.ok(summary.failedVisitCount > 0);
  assert.equal(summary.observations[0].primary.status, "unresolved");
  assert.equal(pointCalls, 0);
});

test("an outside Cisco point identifies another bulk-catalogue room locally", async () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.checkpoints[0].dwellSeconds = 6;
  result.polls.find(item => item.id === "poll-3").normalized.lng += 0.01;
  const outside = result.polls.find(item => item.id === "poll-3").normalized;
  const target = result.checkIns[0].groundTruth;
  const loader = createRoomResolutionLoader({
    resolveCampusRooms: async () => [
      room("truth", target.lng, target.lat, target.z),
      room("wrong-room", outside.lng, outside.lat, outside.z),
    ],
  });
  await loader.load([{ result, exceptions: [] }]);
  assert.equal(loader.summary.observations[0].primary.status, "wrong-room");
  assert.equal(loader.summary.observations[0].primary.room.id, "wrong-room");
});

function room(id, lng, lat, z, radius = 0.001) {
  return { id, name: id, z, geometry: { type: "Polygon", coordinates: [[
    [lng - radius, lat - radius], [lng + radius, lat - radius],
    [lng + radius, lat + radius], [lng - radius, lat + radius],
    [lng - radius, lat - radius],
  ]] } };
}
