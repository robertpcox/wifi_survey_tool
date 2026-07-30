// FEATURE:      Report corridor concern overlay
// SURFACE:      Node test for report-concern-segments.mjs
// WHY TOGETHER: Approach, centre, and RF assertions prove the left/centre/right corridor reading.
// STATE:        One analyzed out-and-back fixture
// RULES:        Approaches carry one direction; the centre needs lock from both directions.
// PROVENANCE:   NDH areas-of-concern map surface · left/centre/right corridor reading

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "./report-analysis.mjs";
import { buildConcernSegments } from "./report-concern-segments.mjs";

const result = JSON.parse(await readFile(
  new URL(
    "../../data/fixtures/report-player/result.out-and-back.fixture.v3.json",
    import.meta.url,
  ),
));
const analysis = analyzeReportResult(result, { stickySeconds: 2, accuracyM: 5 });
const segments = buildConcernSegments(result, analysis);

test("both-direction lock bins paint the hot centre with tap detail", () => {
  const centres = segments.filter(segment => segment.kind === "centre");
  assert.ok(centres.length >= 2);
  const first = centres.find(segment => segment.binDistanceM === 7.5);
  assert.equal(first.direction, "both");
  assert.equal(first.pairId, "concern:centre:5");
  assert.equal(first.z, 0);
  assert.ok(first.coordinates.length >= 2);
  assert.ok(first.forwardLockSeconds >= 3 && first.reverseLockSeconds >= 3);
  assert.equal(first.rfIssue, true);
  assert.equal(
    segments.some(segment => segment.kind === "rf-suspect"
      && segment.binDistanceM === 7.5),
    false,
  );
});

test("one-direction lock bins read as that direction's approach", () => {
  const reverse = segments.find(segment => segment.kind === "approach-reverse");
  assert.equal(reverse.binDistanceM, 2.5);
  assert.equal(reverse.direction, "reverse");
  assert.ok(reverse.reverseLockSeconds > reverse.forwardLockSeconds);
  const kinds = new Set(segments.map(segment => segment.kind));
  assert.equal(kinds.has("centre"), true);
  assert.equal(kinds.has("one-way"), false);
});

test("a raised approach floor drops weak approaches but keeps the centre", () => {
  const strict = buildConcernSegments(result, analysis, {
    approachLockSeconds: 30,
  });
  assert.ok(strict.every(segment => segment.kind === "centre"
    || segment.kind === "rf-suspect"));
  const clear = buildConcernSegments(result, analysis, {
    approachLockSeconds: 30,
    lockSecondsMin: 30,
    errorThresholdM: 100,
  });
  assert.deepEqual(clear, []);
});
