// FEATURE:      Report request diagnostics
// SURFACE:      node --test src/domain/report-request-insights.test.mjs
// WHY TOGETHER: The field outage freezes capture counts, duration, RTT, and positional null handling.
// STATE:        Loaded immutable field result
// RULES:        Failed requests remain visible but never become position samples.
// PROVENANCE:   Scope/steps/05b_improve_report.md observed request behavior

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "./report-analysis.mjs";
import { buildReportCaptureSeries } from "./report-request-insights.mjs";

const result = JSON.parse(await readFile(new URL(
  "../../results/292__566__4a9ba424-a96f-466d-a000-d0ba5d62571e"
    + "__2026-07-30T02-36-21Z.result.v3.json",
  import.meta.url,
)));

test("field request outage remains visible beside usable position samples", () => {
  const analysis = analyzeReportResult(result);
  const capture = buildReportCaptureSeries(result, analysis);

  assert.equal(capture.timeline.length, 2548);
  assert.equal(capture.timeline.filter(point => !point.requestFailed).length, 2542);
  assert.equal(capture.requestFailures.length, 6);
  assert.equal(capture.requestFailures.every(point => point.accuracyM === null), true);
  assert.deepEqual(capture.requestOutages, [{
    startedAt: "2026-07-30T02:15:40.418Z",
    endedAt: "2026-07-30T02:16:45.778Z",
    elapsedSeconds: 4003.451,
    durationSeconds: 65.36,
    requestCount: 6,
    worstRoundTripMs: 12099,
    httpStatus: 0,
    error: "Positioning proxy timed out after 12000 ms",
  }]);
});
