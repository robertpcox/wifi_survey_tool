// FEATURE:      Report Player shared result context
// SURFACE:      node --test src/features/report-player/report-store.test.mjs
// WHY TOGETHER: Result identity, analysis, thresholds, comparison, and mode share one store lifecycle.
// STATE:        Analyzer invocation count and immutable fixture reference
// RULES:        Switching analysis/playback never invokes analysis or parsing.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { createReportPlayerStore } from "./report-store.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("store keeps one result/meta/analysis context across analysis and playback", () => {
  let analysisCalls = 0;
  const store = createReportPlayerStore({
    analyze(value, thresholds) {
      analysisCalls += 1;
      return analyzeReportResult(value, thresholds);
    },
  });
  const loaded = store.load({ result, manifest: { results: [] } });
  assert.equal(loaded.result, result);
  assert.equal(loaded.meta, result.meta);
  assert.equal(analysisCalls, 1);
  const firstAnalysis = loaded.analysis;
  store.setView("playback");
  store.setView("analysis");
  assert.equal(analysisCalls, 1);
  assert.equal(store.snapshot().result, result);
  assert.equal(store.snapshot().meta, result.meta);
  assert.equal(store.snapshot().analysis, firstAnalysis);
  store.setThresholds({ stickySeconds: 2, accuracyM: 5 });
  assert.equal(analysisCalls, 2);
  assert.notEqual(store.snapshot().analysis, firstAnalysis);
});

test("store applies selected thresholds to accepted comparison runs", () => {
  const store = createReportPlayerStore();
  store.load({ result });
  store.setThresholds({ stickySeconds: 3, accuracyM: 7 });
  const candidate = structuredClone(result);
  candidate.run.resultId = "result-report-2";
  candidate.run.startedAt = "2026-07-28T01:00:00.500Z";
  candidate.run.device.name = "Second handset";
  candidate.run.band = "6";
  const comparison = store.addComparison(candidate);
  assert.deepEqual(comparison.thresholds, { stickySeconds: 3, accuracyM: 7 });
  assert.equal(comparison.runs[1].device.band, "6");
});
