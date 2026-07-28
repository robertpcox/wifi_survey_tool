// FEATURE:      Report Player comparison
// SURFACE:      Node test for report-comparison.mjs
// WHY TOGETHER: Fixture variants prove eligibility, baseline, labels, comments, and deltas.
// STATE:        Loaded fixture cloned into deterministic comparison runs
// RULES:        Variants change only fields relevant to the comparison contract.
// PROVENANCE:   Step 5 domain test plan

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { compareReportResults } from "./report-comparison.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));
const thresholds = { stickySeconds: 2, accuracyM: 5 };

test("oldest run is baseline and every absolute value and delta has a device label", () => {
  const newer = variant({
    resultId: "result-report-2",
    startedAt: "2026-07-28T01:00:00.500Z",
    device: {
      type: "laptop",
      name: "Comparison laptop",
      os: "FixtureOS 2",
    },
    band: "6",
    operatorComment: "Second pass after hours.",
  });
  const comparison = compareReportResults([newer, fixture], thresholds);
  assert.equal(comparison.baselineResultId, fixture.run.resultId);
  assert.deepEqual(comparison.thresholds, thresholds);
  assert.deepEqual(
    comparison.runs.map(run => run.resultId),
    [fixture.run.resultId, newer.run.resultId],
  );
  assert.equal(
    comparison.runs[0].operatorComment,
    "Lift unavailable; stairs used.",
  );
  const second = comparison.runs[1];
  assert.match(
    second.label,
    /laptop · Comparison laptop · FixtureOS 2 · band 6/,
  );
  assert.equal(second.operatorComment, "Second pass after hours.");
  assert.deepEqual(second.thresholds, thresholds);
  for (const run of comparison.runs) {
    assert.deepEqual(run.thresholds, thresholds);
    for (const value of Object.values(run.values)) {
      assert.equal(value.label, run.label);
      assert.ok("absolute" in value);
      assert.ok("delta" in value);
    }
  }
  assert.equal(second.values.stickySeconds.delta, 0);
});

test("different devices and bands are accepted for one survey route", () => {
  const alternate = variant({
    resultId: "result-report-band",
    startedAt: "2026-07-28T02:00:00.000Z",
    device: {
      type: "mobile",
      name: "Other handset",
      os: "FixtureOS 9",
    },
    band: "2.4",
    operatorComment: null,
  });
  assert.doesNotThrow(() => (
    compareReportResults([fixture, alternate], thresholds)
  ));
});

test("aborted, survey-mismatched, and route-mismatched runs are rejected", () => {
  const aborted = variant({
    resultId: "aborted",
    completionStatus: "aborted",
  });
  assert.throws(
    () => compareReportResults([fixture, aborted], thresholds),
    /not completed/,
  );
  const otherSurvey = variant({
    resultId: "survey-mismatch",
    surveyId: "33333333-3333-4333-8333-333333333333",
  });
  assert.throws(
    () => compareReportResults([fixture, otherSurvey], thresholds),
    /matching survey IDs/,
  );
  const otherRoute = variant({
    resultId: "route-mismatch",
    routeHash: "c".repeat(64),
  });
  assert.throws(
    () => compareReportResults([fixture, otherRoute], thresholds),
    /matching route hashes/,
  );
});

function variant(changes) {
  const result = structuredClone(fixture);
  const {
    device,
    ...runChanges
  } = changes;
  Object.assign(result.run, runChanges);
  if (device) Object.assign(result.run.device, device);
  return result;
}
