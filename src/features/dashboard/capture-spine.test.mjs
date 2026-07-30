// FEATURE:      Dashboard capture converter
// SURFACE:      node --test src/features/dashboard/capture-spine.test.mjs
// WHY TOGETHER: Deployed-run choices and uploaded-run parsing assertions cover both spine sources.
// STATE:        Loaded valid spine fixture
// RULES:        Uploaded spines face the same v3 validation deployed runs already passed.
// PROVENANCE:   iCloud Cloud/server.py multi-device capture, wired in 2026-07-30

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  captureSpineChoices,
  parseCaptureRecords,
  parseSpineResult,
  spineRunLabel,
} from "./capture-spine.mjs";

const spineText = await readFile(
  new URL("../../domain/fixtures/result.valid.json", import.meta.url),
  "utf8",
);

test("spine choices offer completed manifest runs, newest first", () => {
  const entry = (overrides = {}) => ({
    surveyId: "s1",
    completionStatus: "completed",
    path: "results/a.result.v3.json",
    ...overrides,
  });
  const choices = captureSpineChoices({
    surveys: [{ surveyId: "s1", surveyName: "All Floors" }],
    results: [
      entry({
        resultId: "r1",
        exportedAt: "2026-07-29T01:00:00Z",
        device: { name: "iPhone" },
      }),
      entry({
        resultId: "r2",
        completionStatus: "aborted",
        exportedAt: "2026-07-30T01:00:00Z",
      }),
      entry({
        resultId: "r3",
        surveyId: "s9",
        exportedAt: "2026-07-30T02:00:00Z",
      }),
    ],
  });
  assert.deepEqual(choices.map(choice => choice.resultId), ["r3", "r1"]);
  assert.equal(choices[1].label, "All Floors · iPhone · 2026-07-29T01:00:00Z");
  assert.equal(choices[0].label, "s9 · Unnamed device · 2026-07-30T02:00:00Z");
  assert.deepEqual(captureSpineChoices(null), []);
});

test("uploaded spines parse through the same v3 validation", () => {
  const spine = parseSpineResult(spineText);
  assert.equal(spine.schemaVersion, 3);
  assert.equal(
    spineRunLabel(spine),
    "Demo route · Demo handset · 2026-07-28T01:00:31.000Z",
  );
  assert.throws(() => parseSpineResult("not json"), /Spine file is not valid JSON\./);
  assert.throws(
    () => parseSpineResult('{"schemaVersion":2}'),
    /Uploaded file is not a valid v3 result\./,
  );
});

test("capture records parse with a clear JSON error", () => {
  assert.deepEqual(parseCaptureRecords("[]"), []);
  assert.throws(() => parseCaptureRecords("{oops"), /Capture file is not valid JSON\./);
});
