// FEATURE:      Report reviewed-exception coverage
// SURFACE:      Node test for report-reviewed-exceptions.mjs
// WHY TOGETHER: Coverage clipping and report-analysis integration prove interval removal.
// STATE:        One compact report fixture and an immutable clone receipt
// RULES:        Exclusion changes calculations, not captured check-ins, polls, or playback truth.
// PROVENANCE:   Scope/contracts/survey_lineage_and_exceptions.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "./report-analysis.mjs";
import { buildGroundTruthModel } from "./report-ground-truth.mjs";
import {
  applyReportCoverage,
  buildReportCoverage,
} from "./report-reviewed-exceptions.mjs";

const result = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("a reviewed interval clips analysis while preserving raw playback truth", () => {
  const original = structuredClone(result);
  const exceptions = [reviewedInterval()];
  const playbackTruth = buildGroundTruthModel(result);
  const coverage = buildReportCoverage(result, exceptions, playbackTruth);
  const reportTruth = applyReportCoverage(playbackTruth, coverage);
  const fromMs = Date.parse(result.checkIns[0].at);
  const toMs = Date.parse(result.checkIns[1].at);
  assert.equal(coverage.excludedSeconds, (toMs - fromMs) / 1000);
  assert.equal(reportTruth.at((fromMs + toMs) / 2), null);
  assert.ok(playbackTruth.at((fromMs + toMs) / 2));

  const baseline = analyzeReportResult(result, { stickySeconds: 2, accuracyM: 5 });
  const amended = analyzeReportResult(
    result,
    { stickySeconds: 2, accuracyM: 5 },
    exceptions,
  );
  assert.ok(amended.metrics.measuredSeconds < baseline.metrics.measuredSeconds);
  assert.equal(amended.reviewedExceptions[0].code, "missing-check-in");
  assert.equal(amended.coverage.excludedSeconds, coverage.excludedSeconds);
  assert.deepEqual(result, original);
});

function reviewedInterval() {
  return {
    id: "fixture-missing-check-in",
    resultId: result.run.resultId,
    routeHash: result.run.routeHash,
    routeAnchor: {
      type: "checkpoint-interval",
      routeHash: result.run.routeHash,
      fromCheckpointId: "checkpoint-a",
      toCheckpointId: "checkpoint-b",
      legId: "leg-a-c",
    },
    code: "missing-check-in",
    reason: "The route ground truth is not defensible for this interval.",
    disposition: "exclude-interval",
    reviewer: "fixture-reviewer",
    recordedAt: "2026-08-10T00:00:00.000Z",
  };
}
