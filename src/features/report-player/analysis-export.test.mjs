// FEATURE:      Report Player analysis export
// SURFACE:      node --test src/features/report-player/analysis-export.test.mjs
// WHY TOGETHER: Lane rows and JSON summary assertions prove one export projection.
// STATE:        Parsed report fixture and one real analysis
// RULES:        Exports carry all three fix lanes without mutating their sources.
// PROVENANCE:   NDH 2026-07-30 fix-matched accuracy findings

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { createAnalysisExports } from "./analysis-export.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("exports carry the accuracy, freshness, and availability lanes", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
    noPositionSeconds: 6,
  });
  const files = createAnalysisExports(result, analysis);
  const summary = JSON.parse(files.json.content);
  assert.equal(summary.fixes.accuracy.uniqueFixCount, 3);
  assert.equal(summary.fixes.accuracy.withinConfidenceCount, 1);
  assert.equal(summary.fixes.availability.successPercent, 100);
  assert.equal(
    summary.noPositionEpisodes.length,
    analysis.fixes.noPosition.episodes.length,
  );
  assert.match(files.csv.content, /"no-position-episode","0","2026-07-28T/);
  assert.match(
    files.csv.content,
    /"fix-accuracy","","withinConfidencePercent","33\.333","percent"/,
  );
  assert.match(
    files.csv.content,
    /"fix-freshness","","longestHoldSeconds","6","seconds"/,
  );
  assert.match(files.csv.content, /"fix-availability","","medianRttMs","100","milliseconds"/);
  assert.deepEqual(summary.reviewedExceptions, []);
});

test("a lane-less legacy analysis still exports safely", () => {
  const files = createAnalysisExports(result, {
    thresholds: { stickySeconds: 4, accuracyM: 5 },
    floors: [],
    metrics: { sampleCount: 7 },
    heatmaps: { sticky: [], accuracy: [] },
  });
  const summary = JSON.parse(files.json.content);
  assert.deepEqual(summary.fixes, {
    accuracy: {},
    freshness: {},
    availability: {},
  });
  assert.deepEqual(summary.noPositionEpisodes, []);
  assert.match(files.csv.content, /"metric","","sampleCount","7","count"/);
});
