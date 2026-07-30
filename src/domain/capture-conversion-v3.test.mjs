// FEATURE:      DesktopCloud capture conversion
// SURFACE:      Node test for capture-conversion-v3.mjs
// WHY TOGETHER: Grouping, injection, exclusion, and v3 validity are one conversion contract.
// STATE:        Loaded valid spine fixture and a stub source contract
// RULES:        The core needs injected normalize/id factories and rejects invalid spines.
// PROVENANCE:   iCloud Cloud/server.py multi-device capture, wired in 2026-07-30

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  captureDeviceGroups,
  convertPositionCapture,
} from "./capture-conversion-v3.mjs";
import { validateSurveyResultV3 } from "./survey-result-v3.mjs";

const spine = JSON.parse(await readFile(
  new URL("./fixtures/result.valid.json", import.meta.url),
));
const options = {
  normalizeOutcome: stubNormalizeOutcome,
  resultId: () => "11111111-2222-4333-8444-555555555555",
};

function record(overrides = {}) {
  return {
    deviceId: "d1",
    deviceName: "iPhone B",
    clientIp: "10.132.184.60",
    status: 200,
    timeSent: "2026-07-30T05:12:00.000Z",
    timeReceived: "2026-07-30T05:12:01.100Z",
    data: { latitude: -45.87247, longitude: 170.50854, zLevel: 1 },
    ...overrides,
  };
}

function stubNormalizeOutcome(outcome) {
  const hasPosition = Number.isFinite(outcome.raw?.latitude);
  return {
    ...outcome,
    roundTripMs: Date.parse(outcome.receivedAt) - Date.parse(outcome.sentAt),
    success: Boolean(outcome.success && hasPosition),
    normalized: hasPosition
      ? {
        lat: outcome.raw.latitude,
        lng: outcome.raw.longitude,
        z: outcome.raw.zLevel,
        fixTime: null,
        confidence: null,
      }
      : null,
  };
}

test("groups split by device, drop throttled records, and sort by timeSent", () => {
  const groups = captureDeviceGroups([
    record({ timeSent: "2026-07-30T05:12:04.000Z" }),
    record(),
    record({ deviceName: "iPhone C", clientIp: "10.132.184.61" }),
    record({ throttled: true }),
  ]);
  assert.equal(groups.size, 2);
  const first = groups.get("iPhone B|10.132.184.60");
  assert.equal(first.length, 2);
  assert.ok(Date.parse(first[0].timeSent) < Date.parse(first[1].timeSent));
});

test("conversion mints a valid per-device result through the injected contract", () => {
  const outputs = convertPositionCapture(spine, [record()], options);
  assert.equal(outputs.length, 1);
  const { filename, result } = outputs[0];
  assert.match(filename, /__iphone-b\.result\.v3\.json$/);
  assert.equal(validateSurveyResultV3(result).valid, true);
  assert.equal(result.run.resultId, "11111111-2222-4333-8444-555555555555");
  assert.equal(result.run.device.name, "iPhone B");
  assert.equal(result.run.device.os, "external-capture");
  assert.equal(result.run.preflight.sampleId, "poll-iphone-b-1");
});

test("device overrides shape identity while defaults inherit the spine run", () => {
  const [plain] = convertPositionCapture(spine, [record()], options);
  assert.equal(plain.result.run.device.type, spine.run.device.type);
  assert.equal(plain.result.run.band, spine.run.band);
  assert.equal(plain.result.run.device.os, "external-capture");
  const [shaped] = convertPositionCapture(spine, [record()], {
    ...options,
    deviceOverrides: {
      "10.132.184.60": { type: "laptop", os: "iPadOS 26", band: "6" },
    },
  });
  assert.equal(shaped.result.run.device.type, "laptop");
  assert.equal(shaped.result.run.device.os, "iPadOS 26");
  assert.equal(shaped.result.run.band, "6");
  assert.equal(shaped.result.run.device.name, "iPhone B");
  assert.equal(validateSurveyResultV3(shaped.result).valid, true);
  const [blankOs] = convertPositionCapture(spine, [record()], {
    ...options,
    deviceOverrides: { "10.132.184.60": { os: "" } },
  });
  assert.equal(blankOs.result.run.device.os, "external-capture");
  assert.throws(
    () => convertPositionCapture(spine, [record()], {
      ...options,
      deviceOverrides: { "10.132.184.60": { band: "7" } },
    }),
    /run\.band: unsupported wireless band/,
  );
});

test("excluded client IPs are dropped so the survey device is not doubled", () => {
  const outputs = convertPositionCapture(spine, [
    record(),
    record({ deviceName: "Survey phone", clientIp: "10.132.184.59" }),
  ], { ...options, excludeClientIps: ["10.132.184.59"] });
  assert.deepEqual(outputs.map(output => output.result.run.device.name), ["iPhone B"]);
});

test("missing injections and invalid spines fail loudly", () => {
  assert.throws(
    () => convertPositionCapture(spine, [record()], { resultId: options.resultId }),
    /normalizeOutcome must be a function/,
  );
  assert.throws(
    () => convertPositionCapture(spine, [record()], {
      normalizeOutcome: stubNormalizeOutcome,
    }),
    /resultId must be a function/,
  );
  assert.throws(
    () => convertPositionCapture({ schemaVersion: 2 }, [record()], options),
    /Spine result is not a valid v3 result/,
  );
});
