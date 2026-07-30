// FEATURE:      DesktopCloud position-capture converter
// SURFACE:      node --test coverage for convert_position_capture.mjs
// WHY TOGETHER: Grouping, poll parity, and v3 validity are one conversion contract.
// STATE:        None
// RULES:        The spine fixture stays untouched; conversion must yield schema-valid results.
// PROVENANCE:   iCloud Cloud/server.py multi-device capture, wired in 2026-07-30
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateSurveyResultV3 } from "../src/domain/survey-result-v3.mjs";
import {
  captureDeviceGroups,
  convertPositionCapture,
} from "./convert_position_capture.mjs";

const spinePath = new URL("../src/domain/fixtures/result.valid.json", import.meta.url);

function captureRecord(overrides = {}) {
  return {
    timestamp: "2026-07-30T05:12:00.000Z",
    deviceId: "d1",
    deviceName: "iPhone B",
    clientIp: "10.132.184.60",
    configId: "1185",
    status: 200,
    timeSent: "2026-07-30T05:12:00.000Z",
    timeReceived: "2026-07-30T05:12:01.100Z",
    serverRttMs: 1100,
    data: {
      latitude: -45.87247,
      longitude: 170.50854,
      zLevel: 1,
      lastSeen: 1785388249000,
      confidenceFactor: 4.8768,
    },
    ...overrides,
  };
}

test("captureDeviceGroups splits by device, drops throttled, sorts by timeSent", () => {
  const groups = captureDeviceGroups([
    captureRecord({ timeSent: "2026-07-30T05:12:04.000Z" }),
    captureRecord(),
    captureRecord({ deviceName: "iPhone C", clientIp: "10.132.184.61" }),
    captureRecord({ throttled: true }),
  ]);
  assert.equal(groups.size, 2);
  const first = groups.get("iPhone B|10.132.184.60");
  assert.equal(first.length, 2);
  assert.ok(Date.parse(first[0].timeSent) < Date.parse(first[1].timeSent));
});

test("convertPositionCapture mints a valid per-device v3 result", async () => {
  const spine = JSON.parse(await readFile(spinePath, "utf-8"));
  const outputs = convertPositionCapture(
    spine,
    [captureRecord(), captureRecord({ timeSent: "2026-07-30T05:12:02.000Z", timeReceived: "2026-07-30T05:12:03.000Z" })],
    { resultId: () => "11111111-2222-4333-8444-555555555555" },
  );
  assert.equal(outputs.length, 1);
  const { filename, result } = outputs[0];
  assert.match(filename, /__iphone-b\.result\.v3\.json$/);
  assert.equal(validateSurveyResultV3(result).valid, true);
  assert.equal(result.run.device.name, "iPhone B");
  assert.equal(result.run.device.clientIp, "10.132.184.60");
  assert.equal(result.run.preflight.sampleId, result.polls[0].id);
  assert.equal(result.polls.length, 2);
  const poll = result.polls[0];
  assert.equal(poll.id, "poll-iphone-b-1");
  assert.equal(poll.success, true);
  assert.equal(poll.roundTripMs, 1100);
  assert.equal(poll.normalized.lat, -45.87247);
  assert.equal(poll.normalized.confidence, 4.8768);
  assert.equal(poll.normalized.fixTime, "2026-07-30T05:10:49.000Z");
  assert.deepEqual(result.route, spine.route);
  assert.deepEqual(result.checkIns, spine.checkIns);
});

test("device overrides pass through the CLI wrapper to the domain core", async () => {
  const spine = JSON.parse(await readFile(spinePath, "utf-8"));
  const [output] = convertPositionCapture(spine, [captureRecord()], {
    resultId: () => "11111111-2222-4333-8444-555555555555",
    deviceOverrides: {
      "10.132.184.60": { type: "laptop", os: "iPadOS 26", band: "6" },
    },
  });
  assert.equal(output.result.run.device.type, "laptop");
  assert.equal(output.result.run.device.os, "iPadOS 26");
  assert.equal(output.result.run.band, "6");
  assert.equal(validateSurveyResultV3(output.result).valid, true);
});

test("failed capture polls convert to unsuccessful polls with errors", async () => {
  const spine = JSON.parse(await readFile(spinePath, "utf-8"));
  const [output] = convertPositionCapture(spine, [
    captureRecord(),
    captureRecord({
      status: 502,
      timeSent: "2026-07-30T05:12:06.000Z",
      timeReceived: "2026-07-30T05:12:07.500Z",
      data: { error: "timed out" },
    }),
  ]);
  const failed = output.result.polls[1];
  assert.equal(failed.success, false);
  assert.equal(failed.normalized, null);
  assert.match(failed.error, /timed out/);
  assert.equal(validateSurveyResultV3(output.result).valid, true);
});
