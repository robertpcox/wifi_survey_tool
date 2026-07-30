// FEATURE:      Dynamic room structured-capture run integration tests
// SURFACE:      Dwell staging through mark taps to a marks-bearing paired export
// WHY TOGETHER: The full corridor workflow must close into valid V3 files per device.
// STATE:        Driven timers, straight corridor routing, and one extra device stream
// RULES:        Untapped marks never export; captured order drives route checkpoints.
// PROVENANCE:   Structured dynamic capture request

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createDynamicRoomRunner } from "./dynamic-room-run.mjs";

const definition = JSON.parse(await readFile(new URL(
  "../../../data/fixtures/runner/definition.fixture.v3.json",
  import.meta.url,
)));
const START_MS = Date.parse("2026-07-30T01:00:00.000Z");
const poll = id => ({
  id,
  sourceId: "mazemap-cloud",
  sentAt: "2026-07-30T00:59:59.900Z",
  receivedAt: "2026-07-30T01:00:00.000Z",
  roundTripMs: 100,
  httpStatus: 200,
  success: true,
  normalized: { lat: -45.8724, lng: 170.5085, z: 1, fixTime: null, confidence: 0.9 },
  raw: { fixture: true },
  error: null,
});

test("staged 5 m marks flow into every exported result", async () => {
  let wallMs = START_MS;
  let nextId = 0;
  const timers = [];
  const pollLoop = {
    active: false,
    start() { this.active = true; },
    stop() { this.active = false; },
  };
  const rendered = [];
  const view = {
    phase: "tap-point",
    acceptsMapPoint() {
      return ["tap-point", "walking", "dwelling"].includes(this.phase);
    },
    render(value) {
      this.phase = value.phase;
      rendered.push(structuredClone(value));
    },
  };
  const runner = createDynamicRoomRunner({
    definition,
    entry: {
      deviceType: "mobile",
      deviceOs: "Android 16",
      deviceName: "Field handset",
      clientIp: "192.0.2.8",
      band: "5",
    },
    preflight: { verdict: "green", sampleId: "poll-1", acknowledged: false, reasons: [] },
    polls: [poll("poll-1")],
    pollLoop,
    dwellSeconds: 45,
    markSpacingM: 5,
    extraDevices: [{
      label: "iPhone B",
      clientIp: "192.0.2.9",
      slug: "iphone-b",
      polls: [poll("poll-iphone-b-1")],
    }],
    mapAdapter: {
      currentZLevel: 1,
      drawRoute() {},
      drawStops() {},
      drawWaypoints() {},
      focusWaypoint() {},
      setMapZLevel() {},
    },
    routeBetween: async (from, to) => [
      { lng: from.lng, lat: from.lat, z: from.z },
      { lng: to.lng, lat: to.lat, z: to.z },
    ],
    view,
    nowDate: () => new Date(wallMs),
    nowMs: () => wallMs - START_MS,
    setTimer: callback => timers.push(callback) && timers.length,
    clearTimer() {},
    createId: () => `result-${++nextId}`,
    cryptoRef: {
      subtle: globalThis.crypto.subtle,
      randomUUID: () => "33333333-3333-4333-8333-333333333333",
    },
    operatorComment: () => "Structured corridor walk",
    downloadFile() {},
  });
  runner.start();
  const first = definition.route.stops[0];
  const second = { lng: first.lng, lat: first.lat + 0.0002, z: first.z };
  await runner.handleMapClick({ lngLat: first });
  assert.equal(runner.dwell(), true);
  assert.equal(runner.session.phase, "dwelling");
  await runner.handleMapClick({ lngLat: second });
  assert.equal(runner.session.phase, "dwelling");
  assert.ok(runner.session.stagedPoint);
  await new Promise(resolve => setTimeout(resolve, 0));
  wallMs += 46_000;
  timers.splice(0).forEach(callback => callback());
  assert.equal(runner.session.phase, "pending-point");
  assert.equal(runner.session.markPlan.marks.length, 2);
  assert.deepEqual(
    rendered.at(-1).marks,
    { consumed: 0, total: 2, remaining: 2, pending: runner.session.markPlan.marks },
  );
  wallMs += 5_000;
  assert.equal(runner.passMark(), true);
  wallMs += 5_000;
  assert.equal(runner.passMark(), true);
  assert.equal(runner.passMark(), false);
  wallMs += 5_000;
  assert.equal(runner.checkIn(), true);
  wallMs += 1_000;
  await runner.finish();
  assert.equal(runner.state.completionStatus, "completed");
  const output = runner.state.export;
  assert.deepEqual(
    output.definition.route.checkpoints.map(item => [item.type, item.spacingBasisM]),
    [["stop", 5], ["intermediate", 5], ["intermediate", 5], ["stop", 5]],
  );
  assert.equal(output.definition.route.checkpoints[1].legId, "leg-1");
  assert.equal(output.definition.meta.route.checkpointSpacingM, 5);
  assert.equal(output.definition.route.checkpoints[0].dwellSeconds, 45);
  assert.deepEqual(
    output.result.checkIns.map(item => item.checkpointId),
    ["checkpoint-1", "checkpoint-2", "checkpoint-3", "checkpoint-4"],
  );
  assert.equal(output.deviceResults.length, 1);
  assert.equal(output.deviceResults[0].result.checkIns.length, 4);
  assert.equal(
    output.deviceResults[0].result.route.checkpoints.length,
    4,
  );
});
