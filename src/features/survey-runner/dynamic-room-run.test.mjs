// FEATURE:      Dynamic room active Runner integration tests
// SURFACE:      Exact taps through polling-safe paired export
// WHY TOGETHER: Session, route queue, finalisation, and downloads must close one real workflow.
// STATE:        Two map taps, one deferred route, and an active fake poll loop
// RULES:        Finish cannot stop polling before the background route resolves.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createDynamicRoomRunner } from "./dynamic-room-run.mjs";

const definition = JSON.parse(await readFile(new URL(
  "../../../data/fixtures/runner/definition.fixture.v3.json",
  import.meta.url,
)));
const START_MS = Date.parse("2026-07-30T01:00:00.000Z");
const poll = {
  id: "poll-1",
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
};

test("Finish keeps polling until hidden routing creates both standard files", async () => {
  let wallMs = START_MS;
  let routeResolve;
  const routeReady = new Promise(resolve => { routeResolve = resolve; });
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
    describePoint: async () => ({
      building: { id: "1013513", name: "Clinical Services Building" },
      floor: { id: "floor-1", z: 1, name: "Level 00" },
      poi: { id: null, name: null, center: null },
    }),
    drawRoute() {},
    drawStops() {},
    drawWaypoints() {},
    focusWaypoint() {},
    setMapZLevel() {},
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
    polls: [poll],
    pollLoop,
    mapAdapter,
    routeBetween: () => routeReady,
    view,
    nowDate: () => new Date(wallMs),
    nowMs: () => wallMs - START_MS,
    createId: () => "result-dynamic-1",
    cryptoRef: {
      subtle: globalThis.crypto.subtle,
      randomUUID: () => "33333333-3333-4333-8333-333333333333",
    },
    operatorComment: () => "Live room capture",
    downloadFile: (...args) => downloads.push(args),
  });
  runner.start();
  assert.equal(pollLoop.active, true);
  const first = definition.route.stops[0];
  const second = definition.route.stops[1];
  await runner.handleMapClick({ lngLat: first });
  assert.equal(runner.checkIn(), true);
  wallMs += 20_000;
  await runner.handleMapClick({ lngLat: second });
  assert.equal(runner.checkIn(), true);
  wallMs += 1_000;
  const finalising = runner.finish();
  assert.equal(runner.session.phase, "finalising");
  assert.equal(pollLoop.active, true);
  routeResolve([first, second]);
  await finalising;
  assert.equal(pollLoop.active, false);
  assert.equal(runner.state.completionStatus, "completed");
  assert.equal(runner.state.export.result.run.captureMode, "dynamic-room");
  assert.deepEqual(
    runner.state.export.definition.route.checkpoints.map(item => item.dwellSeconds),
    [0, 0],
  );
  assert.equal(rendered.at(-1).phase, "completed");
  runner.download("definition");
  runner.download("result");
  assert.deepEqual(downloads.map(args => args[0]), [
    "33333333-3333-4333-8333-333333333333.definition.v3.json",
    runner.state.export.files.result.filename,
  ]);
});
