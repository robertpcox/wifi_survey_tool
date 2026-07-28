import assert from "node:assert/strict";
import test from "node:test";

import {
  createPreflightPollLoopOptions,
  runRunnerPreflight,
} from "./preflight.mjs";

function harness(map = {}) {
  const definition = {
    meta: {
      campusId: "566",
      zLevels: [1],
      sourceConfig: {
        configId: "1185",
        pollIntervalMs: 2000,
        proxyBase: "/proxy",
      },
    },
    route: {
      legs: [],
      stops: [{ lat: -45.87, lng: 170.5 }],
      checkpoints: [],
    },
  };
  const sample = {
    id: "poll-1",
    success: true,
    normalized: {
      lat: -45.87,
      lng: 170.5,
      z: 1,
      fixTime: "2026-07-28T01:00:00.000Z",
    },
  };
  const mapAdapter = {
    campusId: "566",
    async launch() {},
    ...map,
  };
  return {
    definition,
    sample,
    mapAdapter,
    credentials: {
      read: name => ({ mapAccess: "memory-map" })[name] || "memory-value",
    },
  };
}

test("preflight loads the configured campus, draws immutable route, and samples", async () => {
  const value = harness();
  const calls = [];
  value.mapAdapter = {
    campusId: "566",
    launch: async (...args) => calls.push(["launch", ...args]),
    drawRoute: route => calls.push(["route", route]),
    drawStops: stops => calls.push(["stops", stops]),
    drawWaypoints: points => calls.push(["points", points]),
  };
  const result = await runRunnerPreflight({
    ...value,
    entry: { clientIp: "192.0.2.8" },
    pollLoop: { sampleOnce: async () => value.sample },
    nowMs: () => Date.parse("2026-07-28T01:00:05.000Z"),
  });
  assert.equal(result.outcome.verdict, "green");
  assert.deepEqual(calls[0], [
    "launch",
    "memory-map",
    null,
    { campusId: "566" },
  ]);
  assert.deepEqual(calls.slice(1).map(call => call[0]), ["route", "stops", "points"]);
});

test("map failure remains a red sample result", async () => {
  const value = harness({
    async launch() {
      throw new Error("private access rejected");
    },
  });
  const result = await runRunnerPreflight({
    ...value,
    entry: { clientIp: "192.0.2.8" },
    pollLoop: { sampleOnce: async () => value.sample },
    nowMs: () => Date.parse("2026-07-28T01:00:05.000Z"),
  });
  assert.equal(result.outcome.verdict, "red");
  assert.match(result.outcome.reasons[0].text, /private access rejected/);
});

test("poll-loop options carry definition cadence and current entry values", () => {
  const value = harness();
  const options = createPreflightPollLoopOptions({
    ...value,
    entry: () => ({ clientIp: "192.0.2.8" }),
    source: { id: "mazemap-cloud", poll() {} },
    onSample() {},
  });
  assert.equal(options.intervalMs, 2000);
  assert.deepEqual(options.request(), {
    proxyBase: "/proxy",
    configId: "1185",
    clientIp: "192.0.2.8",
    appId: "memory-value",
    appKey: ["memory", "value"].join("-"),
  });
});
