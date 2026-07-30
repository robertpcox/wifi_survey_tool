// FEATURE:      Dynamic room Runner preflight orchestration tests
// SURFACE:      Route-free launch, sample, and campus boundary
// WHY TOGETHER: Map presentation and verdict must use the same selected template.
// STATE:        Stub adapter, credentials, and poll loop
// RULES:        Template route data is cleared and never fitted.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import assert from "node:assert/strict";
import test from "node:test";
import { runDynamicRoomPreflight } from "./dynamic-room-preflight.mjs";

const definition = {
  meta: {
    campusId: "566",
    sourceConfig: { pollIntervalMs: 2000 },
  },
  route: { legs: [{ id: "hidden" }], stops: [{}], checkpoints: [{}] },
};
const sample = {
  id: "poll-1",
  success: true,
  normalized: {
    lng: 170.5,
    lat: -45.8,
    z: 99,
    fixTime: "2026-07-30T01:00:01.000Z",
  },
};

test("dynamic preflight clears the template route and accepts an arbitrary floor", async () => {
  const calls = [];
  const result = await runDynamicRoomPreflight({
    definition,
    credentials: { read: () => "map-token" },
    mapAdapter: {
      campusId: "566",
      ready: true,
      async launch(...args) { calls.push(["launch", ...args]); },
      drawRoute: value => calls.push(["route", value]),
      drawStops: value => calls.push(["stops", value]),
      drawWaypoints: value => calls.push(["points", value]),
      setActiveLeg: value => calls.push(["active", value]),
      clearTargetMarker: () => calls.push(["marker"]),
      resizeMapSoon: () => calls.push(["resize"]),
    },
    pollLoop: {
      sampleOnce: async context => {
        calls.push(["sample", context]);
        return sample;
      },
    },
    onMapClick() {},
    nowMs: () => Date.parse("2026-07-30T01:00:05.000Z"),
  });
  assert.equal(result.outcome.verdict, "green");
  assert.deepEqual(calls.filter(call => ["route", "stops", "points"].includes(call[0])), [
    ["route", []],
    ["stops", []],
    ["points", []],
  ]);
  assert.equal(calls.some(call => call[0] === "fit"), false);
  assert.deepEqual(calls.at(-1), ["sample", "preflight"]);
});

test("a mismatched map campus is red while the source sample is retained", async () => {
  const result = await runDynamicRoomPreflight({
    definition,
    credentials: { read: () => "" },
    mapAdapter: {
      campusId: "999",
      async launch() {},
    },
    pollLoop: { sampleOnce: async () => sample },
    nowMs: () => Date.parse("2026-07-30T01:00:05.000Z"),
  });
  assert.equal(result.outcome.verdict, "red");
  assert.match(result.outcome.reasons[0].text, /campus does not match/);
  assert.equal(result.sample.id, "poll-1");
});
