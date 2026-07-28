// FEATURE:      Report Player methodology and analysis export
// SURFACE:      node --test src/features/report-player/methodology-view.test.mjs
// WHY TOGETHER: One fixture proves explanations, safe CSV, JSON, and download descriptors.
// STATE:        Parsed report fixture and representative shared analysis
// RULES:        Assert meta floor names and source objects remain unchanged.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createAnalysisExports,
  downloadAnalysisExports,
  renderMethodologyView,
} from "./methodology-view.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));
const analysis = {
  thresholds: { stickySeconds: 4, accuracyM: 5 },
  floors: [
    { z: 0, name: "=Ground" },
    { z: 1, name: "First" },
  ],
  metrics: {
    sampleCount: 7,
    stickySeconds: 6,
    outsideAccuracySeconds: 4,
  },
  heatmaps: {
    sticky: [
      { z: 0, name: "=Ground", points: [{ weightSeconds: 6 }] },
      { z: 1, name: "First", points: [] },
    ],
    accuracy: [
      { z: 0, name: "=Ground", points: [{ weightSeconds: 2 }] },
      { z: 1, name: "First", points: [{ weightSeconds: 2 }] },
    ],
  },
};

test("methodology renders fixture floors and explains elapsed-time heat", () => {
  const html = renderMethodologyView({ result, analysis });
  assert.match(html, /more than\s*<strong>4 seconds/);
  assert.match(html, /ground truth is moving/);
  assert.match(html, /Planned checkpoint dwell is excluded/);
  assert.match(html, /more than\s*<strong>5 metres/);
  assert.match(html, /ground truth, not at the reported fix/);
  assert.match(html, /Ground \(z 0\)/);
  assert.match(html, /First \(z 1\)/);
});

test("exports derive safe CSV and JSON from one unchanged analysis", () => {
  const beforeResult = JSON.stringify(result);
  const beforeAnalysis = JSON.stringify(analysis);
  const files = createAnalysisExports(result, analysis);
  const summary = JSON.parse(files.json.content);

  assert.equal(summary.result.resultId, "result-report-1");
  assert.equal(summary.metrics.sampleCount, 7);
  assert.equal(summary.heatmaps[0].seconds, 6);
  assert.match(files.csv.content, /^"section","floor","metric","value","unit"/);
  assert.match(files.csv.content, /"result-report-1"/);
  assert.match(files.csv.content, /"'=Ground"/);
  assert.equal(files.csv.content.includes('"=Ground"'), false);
  assert.equal(JSON.stringify(result), beforeResult);
  assert.equal(JSON.stringify(analysis), beforeAnalysis);

  const downloads = [];
  downloadAnalysisExports({
    result,
    analysis,
    downloadFile: (...args) => downloads.push(args),
  });
  assert.deepEqual(downloads.map(call => call[2]), [
    "text/csv",
    "application/json",
  ]);
});
