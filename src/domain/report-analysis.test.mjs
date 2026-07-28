// FEATURE:      Report Player analysis
// SURFACE:      Node test for report-analysis.mjs
// WHY TOGETHER: Fixture assertions cover threshold metrics and both heatmaps.
// STATE:        Loaded immutable report result fixture
// RULES:        Exact thresholds are excluded and floor labels only use result meta.
// PROVENANCE:   Step 5 domain test plan

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "./report-analysis.mjs";
import { buildGroundTruthModel } from "./report-ground-truth.mjs";

const result = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("sticky heat uses elapsed moving time and excludes planned dwell", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 5,
  });
  assert.deepEqual(analysis.floors, [
    { z: 0, name: "Ground" },
    { z: 1, name: "First" },
  ]);
  assert.equal(analysis.metrics.sampleCount, 7);
  assert.equal(analysis.timeline.some(sample => sample.pollId === "poll-1"), false);
  assert.equal(analysis.metrics.measuredSeconds, 16);
  assert.equal(analysis.metrics.movingSeconds, 12);
  assert.equal(analysis.metrics.stickySeconds, 8);
  assert.equal(analysis.timeline.at(-1).pollId, "poll-8");
  assert.equal(
    analysis.heatmaps.sticky.flatMap(floor => floor.points)
      .some(point => point.at > "2026-07-28T01:00:10.000Z"
        && point.at < "2026-07-28T01:00:12.000Z"),
    false,
  );
  assert.equal(analysis.heatmaps.sticky[1].points.length, 0);
});

test("confidence changes do not reset a fix and exact thresholds are excluded", () => {
  const atFourSeconds = analyzeReportResult(result, {
    stickySeconds: 4,
    accuracyM: 5,
  });
  assert.equal(atFourSeconds.metrics.stickySeconds, 6);
  assert.equal(
    atFourSeconds.timeline.find(sample => sample.pollId === "poll-3").sticky,
    false,
  );

  const initial = atFourSeconds.timeline.find(sample => sample.pollId === "poll-4");
  const exactAccuracy = analyzeReportResult(result, {
    stickySeconds: 4,
    accuracyM: initial.accuracyM,
  });
  assert.equal(
    exactAccuracy.timeline.find(sample => sample.pollId === "poll-4")
      .outsideAccuracy,
    false,
  );
  assert.equal(
    exactAccuracy.heatmaps.accuracy.flatMap(floor => floor.points)
      .some(point => point.pollId === "poll-4"),
    false,
  );
});

test("accuracy heat is weighted at ground truth and grouped by meta floors", () => {
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2,
    accuracyM: 0,
  });
  const heat = analysis.heatmaps.accuracy[0].points[0];
  const timeline = analysis.timeline.find(sample => sample.pollId === heat.pollId);
  const heatTruth = buildGroundTruthModel(result).at(heat.at);
  assert.equal(heat.lng, heatTruth.lng);
  assert.notEqual(heat.lng, timeline.fix.lng);

  const singleFloor = structuredClone(result);
  singleFloor.meta.zLevels = [7];
  singleFloor.meta.zLevelNames = { "7": "Only floor" };
  for (const checkIn of singleFloor.checkIns) checkIn.groundTruth.z = 7;
  for (const poll of singleFloor.polls) poll.normalized.z = 7;
  const single = analyzeReportResult(singleFloor, {
    stickySeconds: 2,
    accuracyM: 5,
  });
  assert.deepEqual(single.floors, [{ z: 7, name: "Only floor" }]);
  assert.deepEqual(
    single.heatmaps.sticky.map(floor => floor.name),
    ["Only floor"],
  );
});
