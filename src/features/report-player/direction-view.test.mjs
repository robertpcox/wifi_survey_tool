// FEATURE:      Report direction overlay view
// SURFACE:      node --test src/features/report-player/direction-view.test.mjs
// WHY TOGETHER: Mirror chart, flags, and verdicts prove one out-and-back rendering.
// STATE:        One analyzed out-and-back fixture
// RULES:        Dead zones read hot in both directions; one-sided evidence reads as latency.
// PROVENANCE:   NDH out-and-back corridor overlay contract

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { renderDirectionView } from "./direction-view.mjs";

const result = JSON.parse(await readFile(
  new URL(
    "../../../data/fixtures/report-player/result.out-and-back.fixture.v3.json",
    import.meta.url,
  ),
));
const analysis = analyzeReportResult(result, { stickySeconds: 2, accuracyM: 5 });

test("direction overlay draws mirrored lock bars and flags both-way spots", () => {
  const html = renderDirectionView({ result, analysis });
  assert.match(html, /Where the corridor is problematic from both entry directions/);
  assert.match(html, /3 spots lock both ways/);
  assert.match(html, /1 spots off by &gt; 5 m both ways/);
  assert.match(html, /1 one-direction \(latency\) spots/);
  assert.equal((html.match(/class="dir-bar hot"/g) ?? []).length, 6);
  assert.equal((html.match(/class="dir-rf"/g) ?? []).length, 1);
  assert.match(html, /direction-panel/);
  assert.match(html, /Ground/);
});

test("flagged table separates RF suspects from dead zones", () => {
  const html = renderDirectionView({ result, analysis });
  assert.match(html, /Dead zone and offset — RF suspect/);
  assert.match(html, /Locks both ways — dead zone/);
  assert.match(html, /8 m<\/td>/);
  assert.match(html, /Out−back delta/);
});

test("a one-way fixture stays clear of both-direction flags", () => {
  const oneWay = JSON.parse(JSON.stringify(result));
  oneWay.route.legs = [oneWay.route.legs[0]];
  oneWay.route.checkpoints = oneWay.route.checkpoints.slice(0, 2);
  oneWay.route.stops = oneWay.route.stops.slice(0, 2);
  oneWay.checkIns = oneWay.checkIns.slice(0, 2);
  oneWay.polls = oneWay.polls.slice(0, 8);
  oneWay.run.stoppedAt = "2026-07-28T01:00:28.000Z";
  const clearAnalysis = analyzeReportResult(oneWay, {
    stickySeconds: 2,
    accuracyM: 5,
  });
  const html = renderDirectionView({ result: oneWay, analysis: clearAnalysis });
  assert.match(html, /0 spots lock both ways/);
  assert.match(html, /No spot locked or erred in/);
  assert.equal((html.match(/class="dir-bar hot"/g) ?? []).length, 0);
});
