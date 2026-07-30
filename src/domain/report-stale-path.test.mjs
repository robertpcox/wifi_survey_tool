// FEATURE:      Report Player no-position-update path
// SURFACE:      Node test for threshold-derived walked route pieces
// WHY TOGETHER: Threshold timing, dwell exclusion, bends, and floors define path correctness.
// STATE:        Loaded deterministic straight and turning fixtures
// RULES:        Tests assert exact truth geometry, never reported Wi-Fi coordinates.
// PROVENANCE:   NDH field-report "where it gets stuck" acceptance

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "./report-analysis.mjs";

const result = JSON.parse(await readFile(new URL(
  "../../data/fixtures/report-player/result.fixture.v3.json",
  import.meta.url,
)));
const turns = JSON.parse(await readFile(new URL(
  "../../data/fixtures/report-player/route-turns.fixture.v3.json",
  import.meta.url,
)));

test("stale path begins at the selected age and excludes planned dwell", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 3,
    accuracyM: 10,
  });
  assert.equal(analysis.stalePathSegments[0].startedAt, "2026-07-28T01:00:05.000Z");
  assert.equal(analysis.stalePathSegments[0].fixAgeStartSeconds, 3);
  assert.equal(pathSeconds(analysis.stalePathSegments), analysis.metrics.stickySeconds);
  assert.equal(analysis.stalePathSegments.some(piece => (
    piece.startedAt < "2026-07-28T01:00:12.000Z"
    && piece.endedAt > "2026-07-28T01:00:10.000Z"
  )), false);
});

test("stale path preserves authored bends and truth-floor route slices", () => {
  const turningResult = structuredClone(result);
  turningResult.route = turns.route;
  turningResult.checkIns = turns.checkIns;
  const pieces = analyzeReportResult(turningResult, {
    stickySeconds: 0,
    accuracyM: 10,
  }).stalePathSegments;

  assert.deepEqual([...new Set(pieces.map(piece => piece.z))], [0, 1]);
  assert.ok(pieces.some(piece => (
    samePoint(piece.coordinates.at(-1), [0.001, 0])
  )));
  assert.ok(pieces.some(piece => (
    samePoint(piece.coordinates[0], [0.001, 0])
  )));
  assert.ok(pieces.some(piece => (
    piece.z === 1
    && samePoint(piece.coordinates[0], [0.001, 0.001])
  )));
  assert.equal(pieces.some(piece => (
    piece.startedAt < "2026-07-28T01:00:12.000Z"
    && piece.endedAt > "2026-07-28T01:00:10.000Z"
  )), false);
});

function pathSeconds(pieces) {
  return Math.round(
    pieces.reduce((total, piece) => total + piece.durationSeconds, 0) * 1000,
  ) / 1000;
}

function samePoint(actual, expected) {
  return actual.every((value, index) => Math.abs(value - expected[index]) < 1e-12);
}
