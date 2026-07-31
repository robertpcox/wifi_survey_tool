// FEATURE:      Dynamic room per-device result export tests
// SURFACE:      Device result files inside finaliseDynamicSurvey and the download seam
// WHY TOGETHER: Each polled device must publish and download one collision-safe V3 file.
// STATE:        Deterministic capture evidence with two extra devices
// RULES:        Device files share the run evidence; only identity, polls, and ids differ.
// PROVENANCE:   Dynamic room multi-device capture request

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createDynamicRouteAuthor } from "./dynamic-route-author.mjs";
import { deviceResultFilename } from "./dynamic-device-results.mjs";
import { downloadDynamicRoomFile } from "./dynamic-room-download.mjs";
import { finaliseDynamicSurvey } from "./dynamic-survey-export.mjs";

const fixtureUrl = "../../../data/fixtures/runner/definition.fixture.v3.json";
const fixture = JSON.parse(await readFile(new URL(fixtureUrl, import.meta.url)));
const NOW = "2026-07-30T01:02:03.000Z";
const poll = id => ({
  id,
  sourceId: "mazemap-cloud",
  sentAt: "2026-07-30T01:00:01.000Z",
  receivedAt: "2026-07-30T01:00:01.100Z",
  roundTripMs: 100,
  httpStatus: 200,
  success: true,
  normalized: { lat: -45.87, lng: 170.5, z: 1, fixTime: NOW, confidence: 0.9 },
  raw: { provider: "fixture" },
  error: null,
});

test("finalise emits one extra V3 result per polled device", async () => {
  const stops = structuredClone(fixture.route.stops);
  const routeAuthor = createDynamicRouteAuthor({
    routeBetween: async () => [stops[0], stops[1]],
  });
  stops.forEach(stop => routeAuthor.commitStop(stop));
  const output = await finaliseDynamicSurvey({
    routeAuthor,
    definitionInput: { meta: fixture.meta, routeId: "dynamic-room-route" },
    dwellSecondsByStopId: { [stops[0].id]: 45, [stops[1].id]: 45 },
    captureAfterRoute: () => capture(stops),
  }, {
    now: () => new Date(NOW),
    cryptoRef: {
      subtle: globalThis.crypto.subtle,
      randomUUID: () => "33333333-3333-4333-8333-333333333333",
    },
  });
  assert.equal(output.deviceResults.length, 1);
  const device = output.deviceResults[0];
  assert.deepEqual(device.result.run.device, {
    type: "asset",
    os: "Spectralink 8744",
    name: "iPhone B",
    clientIp: "192.0.2.9",
  });
  assert.notEqual(device.result.run.device.type, output.result.run.device.type);
  assert.notEqual(device.result.run.device.os, output.result.run.device.os);
  assert.equal(device.result.run.resultId, "result-device-2");
  assert.deepEqual(device.result.polls.map(item => item.id), ["poll-iphone-b-1"]);
  assert.equal(device.result.run.preflight.sampleId, "poll-iphone-b-1");
  assert.deepEqual(device.result.checkIns, output.result.checkIns);
  assert.deepEqual(device.result.route, output.result.route);
  assert.equal(
    device.file.filename,
    output.files.result.filename
      .replace(/\.result\.v3\.json$/, "__iphone-b.result.v3.json"),
  );
  assert.deepEqual(JSON.parse(device.file.content), device.result);
  assert.equal(
    deviceResultFilename(device.result, "iphone-b"),
    device.file.filename,
  );
});

test("a result download also delivers every device file", () => {
  const downloads = [];
  const output = {
    files: {
      definition: { filename: "a.definition.v3.json", content: "{}", type: "application/json" },
      result: { filename: "a.result.v3.json", content: "{}", type: "application/json" },
    },
    deviceResults: [{
      file: { filename: "a__iphone-b.result.v3.json", content: "{}", type: "application/json" },
    }],
  };
  const options = { downloadFile: name => downloads.push(name) };
  downloadDynamicRoomFile(output, "definition", options);
  assert.deepEqual(downloads, ["a.definition.v3.json"]);
  downloadDynamicRoomFile(output, "result", options);
  assert.deepEqual(downloads, [
    "a.definition.v3.json",
    "a.result.v3.json",
    "a__iphone-b.result.v3.json",
  ]);
});

function capture(stops) {
  return {
    entry: {
      deviceType: "mobile",
      deviceOs: "Android 16",
      deviceName: "Field handset",
      clientIp: "192.0.2.8",
      band: "5",
    },
    preflight: { verdict: "green", sampleId: "poll-1", acknowledged: false, reasons: [] },
    polls: [poll("poll-1")],
    checkIns: stops.map((stop, index) => ({
      checkpointId: `checkpoint-${index + 1}`,
      at: `2026-07-30T01:00:0${index + 3}.000Z`,
      groundTruth: { lng: stop.lng, lat: stop.lat, z: stop.z },
    })),
    events: [
      { type: "run-started", at: "2026-07-30T01:00:00.000Z" },
      { type: "run-completed", at: "2026-07-30T01:02:00.000Z" },
    ],
    notes: [],
    startedAt: "2026-07-30T01:00:00.000Z",
    stoppedAt: "2026-07-30T01:02:00.000Z",
    exportedAt: NOW,
    completionStatus: "completed",
    operatorComment: "Dynamic room walk",
    resultId: "result-dynamic-1",
    extraDevices: [
      {
        label: "iPhone B",
        clientIp: "192.0.2.9",
        slug: "iphone-b",
        deviceType: "asset",
        deviceOs: "Spectralink 8744",
        polls: [poll("poll-iphone-b-1")],
        resultId: "result-device-2",
      },
      {
        label: "iPhone C",
        clientIp: "192.0.2.10",
        slug: "iphone-c",
        polls: [],
        resultId: "result-device-3",
      },
    ],
  };
}
