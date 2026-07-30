// FEATURE:      Dynamic room multi-device run integration tests
// SURFACE:      Run-level dwell and per-device exports through the active runner
// WHY TOGETHER: Dwell selection and device streams must survive a full capture cycle.
// STATE:        Two map taps, deferred routing, and one recorded extra-device stream
// RULES:        Every polled device downloads its own collision-safe result file.
// PROVENANCE:   Dynamic room multi-device capture request

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
  normalized: {
    lat: -45.8724,
    lng: 170.5085,
    z: 1,
    fixTime: "2026-07-30T00:59:59.000Z",
    confidence: 0.9,
  },
  raw: { fixture: true },
  error: null,
});

test("a 45-second run exports one result per device without touching the primary", async () => {
  let wallMs = START_MS;
  let nextId = 0;
  const pollLoop = {
    active: false,
    start() { this.active = true; },
    stop() { this.active = false; },
  };
  const rendered = [];
  const downloads = [];
  const view = {
    phase: "tap-point",
    acceptsMapPoint() {
      return ["tap-point", "walking"].includes(this.phase);
    },
    render(value) {
      this.phase = value.phase;
      rendered.push(structuredClone(value));
    },
  };
  const mapAdapter = {
    currentZLevel: 1,
    drawRoute() {},
    drawStops() {},
    drawWaypoints() {},
    focusWaypoint() {},
    setMapZLevel() {},
  };
  const extraDevice = {
    label: "iPhone B",
    clientIp: "192.0.2.9",
    slug: "iphone-b",
    polls: [poll("poll-iphone-b-1")],
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
    preflight: {
      verdict: "green",
      sampleId: "poll-1",
      acknowledged: false,
      reasons: [],
    },
    polls: [poll("poll-1")],
    pollLoop,
    dwellSeconds: 45,
    extraDevices: [extraDevice],
    mapAdapter,
    routeBetween: async (from, to) => [from, to],
    view,
    nowDate: () => new Date(wallMs),
    nowMs: () => wallMs - START_MS,
    createId: () => `result-${++nextId}`,
    cryptoRef: {
      subtle: globalThis.crypto.subtle,
      randomUUID: () => "33333333-3333-4333-8333-333333333333",
    },
    operatorComment: () => "Two-device corridor walk",
    downloadFile: (...args) => downloads.push(args[0]),
  });
  runner.start();
  assert.equal(runner.session.dwellSeconds, 45);
  const [first, second] = definition.route.stops;
  await runner.handleMapClick({ lngLat: first });
  assert.equal(rendered.at(-1).dwellSeconds, 45);
  assert.equal(runner.checkIn(), true);
  wallMs += 20_000;
  await runner.handleMapClick({ lngLat: second });
  assert.equal(runner.checkIn(), true);
  wallMs += 1_000;
  await runner.finish();
  assert.equal(runner.state.completionStatus, "completed");
  const output = runner.state.export;
  assert.equal(output.deviceResults.length, 1);
  const device = output.deviceResults[0];
  assert.equal(device.result.run.device.name, "iPhone B");
  assert.equal(device.result.run.device.clientIp, "192.0.2.9");
  assert.deepEqual(device.result.polls.map(item => item.id), ["poll-iphone-b-1"]);
  assert.deepEqual(device.result.checkIns, output.result.checkIns);
  assert.notEqual(device.result.run.resultId, output.result.run.resultId);
  assert.equal(
    device.file.filename,
    output.files.result.filename
      .replace(/\.result\.v3\.json$/, "__iphone-b.result.v3.json"),
  );
  runner.download("result");
  assert.deepEqual(downloads, [
    output.files.result.filename,
    device.file.filename,
  ]);
});
