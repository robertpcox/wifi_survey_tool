// FEATURE:      Dashboard capture converter
// SURFACE:      node --test src/features/dashboard/capture-convert.test.mjs
// WHY TOGETHER: Panel markup, planning, summaries, and override collection prove one conversion page.
// STATE:        Loaded valid spine fixture and the real source contract
// RULES:        Both spine sources render in one panel; the spine device is skipped visibly.
// PROVENANCE:   iCloud Cloud/server.py multi-device capture, wired in 2026-07-30

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { normalizePositionOutcome } from "../../adapters/positioning/source-contract.mjs";
import {
  captureConversionPlan,
  renderCaptureConvertPanel,
  renderCaptureSummary,
} from "./capture-convert.mjs";

const spine = JSON.parse(await readFile(
  new URL("../../domain/fixtures/result.valid.json", import.meta.url),
));
const options = {
  normalizeOutcome: normalizePositionOutcome,
  resultId: () => "11111111-2222-4333-8444-555555555555",
};

function record(overrides = {}) {
  return {
    deviceName: "iPhone B",
    clientIp: "10.132.184.60",
    status: 200,
    timeSent: "2026-07-30T05:12:00.000Z",
    timeReceived: "2026-07-30T05:12:01.100Z",
    data: { latitude: -45.87247, longitude: 170.50854, zLevel: 1 },
    ...overrides,
  };
}

test("panel offers deployed-run and uploaded-run spines side by side", () => {
  const html = renderCaptureConvertPanel([
    { resultId: "r3", path: "results/c.result.v3.json", label: "Newest run" },
  ]);
  assert.match(html, /data-capture-convert/);
  assert.match(html, /<option value="r3">/);
  assert.match(html, /or upload a run result file/);
  assert.match(html, /data-capture-spine-file/);
  assert.match(html, /data-capture-file/);
  assert.match(html, /Pick a deployed run or upload one/);
  const uploadOnly = renderCaptureConvertPanel([]);
  assert.doesNotMatch(uploadOnly, /data-capture-spine[">]/);
  assert.match(uploadOnly, /data-capture-spine-file/);
  assert.match(uploadOnly, /No deployed runs listed — upload a run result file/);
});

test("the plan converts extra devices and skips the spine device visibly", () => {
  const { outputs, summaries } = captureConversionPlan(spine, [
    record(),
    record({ deviceName: "Survey phone", clientIp: spine.run.device.clientIp }),
  ], options);
  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].result.run.device.name, "iPhone B");
  assert.deepEqual(summaries.map(item => [item.deviceName, item.skipped]), [
    ["iPhone B", false],
    ["Survey phone", true],
  ]);
  assert.equal(summaries[0].pollCount, 1);
  assert.equal(summaries[0].spanLabel, "05:12:00 → 05:12:01 UTC");
  const html = renderCaptureSummary(summaries, { type: "mobile", band: "5" });
  assert.match(html, /Skipped — already the survey device/);
  assert.match(html, /05:12:00 → 05:12:01 UTC/);
  assert.match(html, /is-skipped/);
  assert.match(html, /data-capture-device="10\.132\.184\.60"/);
  assert.match(html, /<option value="mobile" selected>/);
  assert.match(html, /<option value="5" selected>/);
  assert.match(html, /placeholder="external-capture"/);
  assert.equal((html.match(/data-device-band/g) ?? []).length, 1);
});

test("editable identities re-shape converted results through the plan", () => {
  const { outputs } = captureConversionPlan(spine, [record()], {
    ...options,
    deviceOverrides: {
      "10.132.184.60": { type: "laptop", os: "iPadOS 26", band: "6" },
    },
  });
  assert.equal(outputs[0].result.run.device.type, "laptop");
  assert.equal(outputs[0].result.run.device.os, "iPadOS 26");
  assert.equal(outputs[0].result.run.band, "6");
});

test("empty, malformed, and spine-only captures fail with clear messages", () => {
  assert.throws(() => captureConversionPlan(spine, {}, options), /JSON array/);
  assert.throws(() => captureConversionPlan(spine, [], options), /Capture file is empty/);
  assert.throws(
    () => captureConversionPlan(spine, [
      record({ clientIp: spine.run.device.clientIp }),
    ], options),
    /matches the survey device itself/,
  );
  assert.throws(
    () => captureConversionPlan(spine, [record({ clientIp: null })], options),
    /No convertible device records/,
  );
});
