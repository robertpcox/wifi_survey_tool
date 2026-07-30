// FEATURE:      Report warning analysis
// SURFACE:      node --test src/domain/report-warnings.test.mjs
// WHY TOGETHER: Fixture episodes freeze stale and wrong-floor summary semantics.
// STATE:        Loaded immutable report fixture
// RULES:        Dwell stays excluded, ties are deterministic, and raw fixes never change.
// PROVENANCE:   Scope/contracts/report_analysis.md observed positioning behavior

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "./report-analysis.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("warnings summarize elapsed fixture episodes without mutating evidence", () => {
  const result = structuredClone(fixture);
  const before = JSON.stringify(result);
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
  });

  const { episodes: staleEpisodes, ...staleSummary } = analysis.warnings.stalePosition;
  assert.deepEqual(staleEpisodes.map(episode => episode.affectedSeconds), [4, 4]);
  assert.deepEqual(staleSummary, {
    kind: "stale-position",
    active: true,
    affectedSeconds: 8,
    affectedPercent: 66.667,
    episodeCount: 2,
    sampleCount: 4,
    worstSeconds: 4,
    representative: {
      atMs: Date.parse("2026-07-28T01:00:05.000Z"),
      at: "2026-07-28T01:00:05.000Z",
      lng: 170.50003333333333,
      lat: -45.87,
      z: 0,
      routeDistanceM: 2.580792405711057,
      activeLegId: "leg-a-c",
      pollId: "poll-2",
      weightSeconds: 2,
    },
    thresholdSeconds: 2,
  });
  const { episodes: floorEpisodes, ...floorSummary } = analysis.warnings.floorMismatch;
  assert.deepEqual(floorEpisodes.map(episode => [episode.z, episode.reportedZ]), [[0, 1]]);
  assert.deepEqual(floorSummary, {
    kind: "floor-mismatch",
    active: true,
    affectedSeconds: 2,
    affectedPercent: 12.5,
    episodeCount: 1,
    sampleCount: 1,
    worstSeconds: 2,
    representative: {
      atMs: Date.parse("2026-07-28T01:00:17.000Z"),
      at: "2026-07-28T01:00:17.000Z",
      lng: 170.50036666666668,
      lat: -45.87,
      z: 0,
      routeDistanceM: 28.388716462821627,
      activeLegId: "leg-a-c",
      pollId: "poll-8",
      weightSeconds: 2,
      reportedLng: 170.5004,
      reportedLat: -45.87,
      reportedZ: 1,
    },
    points: [{
      atMs: Date.parse("2026-07-28T01:00:17.000Z"),
      at: "2026-07-28T01:00:17.000Z",
      lng: 170.50036666666668,
      lat: -45.87,
      z: 0,
      routeDistanceM: 28.388716462821627,
      activeLegId: "leg-a-c",
      pollId: "poll-8",
      weightSeconds: 2,
      reportedLng: 170.5004,
      reportedLat: -45.87,
      reportedZ: 1,
    }],
    floorPairs: [{
      groundTruthZ: 0,
      reportedZ: 1,
      affectedSeconds: 2,
      sampleCount: 1,
    }],
  });
  assert.equal(JSON.stringify(result), before);
});

test("inactive records stay stable and floor-pair ties use time then z", () => {
  const clean = structuredClone(fixture);
  clean.meta.zLevels = [0];
  clean.meta.zLevelNames = { "0": "Ground" };
  clean.route.stops.at(-1).z = 0;
  clean.route.legs[0].geometry.at(-1).z = 0;
  clean.route.checkpoints.at(-1).z = 0;
  clean.checkIns.at(-1).groundTruth.z = 0;
  clean.polls.at(-1).normalized.z = 0;
  const inactive = analyzeReportResult(clean, {
    stickySeconds: 100,
    accuracyM: 5,
  }).warnings;

  assert.equal(inactive.stalePosition.active, false);
  assert.equal(inactive.stalePosition.episodeCount, 0);
  assert.equal(inactive.stalePosition.representative, null);
  assert.deepEqual(inactive.floorMismatch, {
    kind: "floor-mismatch",
    active: false,
    affectedSeconds: 0,
    affectedPercent: 0,
    episodeCount: 0,
    episodes: [],
    sampleCount: 0,
    worstSeconds: 0,
    representative: null,
    points: [],
    floorPairs: [],
  });

  const paired = structuredClone(fixture);
  paired.polls.find(poll => poll.id === "poll-2").normalized.z = 1;
  paired.polls.find(poll => poll.id === "poll-8").normalized.z = 0;
  const warning = analyzeReportResult(paired, {
    stickySeconds: 2,
    accuracyM: 5,
  }).warnings.floorMismatch;
  assert.equal(warning.episodeCount, 2);
  assert.equal(warning.sampleCount, 2);
  assert.equal(warning.worstSeconds, 2);
  assert.equal(warning.representative.pollId, "poll-2");
  assert.deepEqual(warning.floorPairs, [
    { groundTruthZ: 0, reportedZ: 1, affectedSeconds: 2, sampleCount: 1 },
    { groundTruthZ: 1, reportedZ: 0, affectedSeconds: 2, sampleCount: 1 },
  ]);
});
