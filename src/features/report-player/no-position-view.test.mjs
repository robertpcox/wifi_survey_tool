// FEATURE:      Report effective-availability view
// SURFACE:      node --test src/features/report-player/no-position-view.test.mjs
// WHY TOGETHER: Headline, located episode rows, and the clean state prove one dropout view.
// STATE:        One analyzed out-and-back fixture
// RULES:        The view names where coverage dropped and never recomputes domain totals.
// PROVENANCE:   NDH availability lane · provider always 200s with the last-ever fix

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { renderNoPositionView } from "./no-position-view.mjs";

const result = JSON.parse(await readFile(
  new URL(
    "../../../data/fixtures/report-player/result.out-and-back.fixture.v3.json",
    import.meta.url,
  ),
));

test("dropout episodes render with time, duration, floor, and route position", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
    noPositionSeconds: 8,
  });
  const html = renderNoPositionView({ result, analysis });
  assert.match(html, /Where coverage effectively dropped out/);
  assert.match(html, /5 episodes/);
  assert.match(html, /16\.0 s \(26\.667% of the run\)/);
  assert.match(html, /older than\s*8 s/);
  assert.match(html, /0:28<\/td>/);
  assert.match(html, /8\.0 s<\/td>/);
  assert.match(html, /Ground<\/td>/);
  assert.match(html, /37 m along route/);
});

test("a clean run says so instead of rendering an empty table", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
    noPositionSeconds: 30,
  });
  const html = renderNoPositionView({ result, analysis });
  assert.match(html, /never went effectively\s*missing for more than 30 s/);
  assert.doesNotMatch(html, /<tbody>/);
});
