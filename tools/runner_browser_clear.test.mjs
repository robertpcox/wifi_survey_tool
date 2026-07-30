// FEATURE:      Runner browser Clear-capture acceptance tests
// SURFACE:      node:test coverage for cleared, fresh, and final-result findings
// WHY TOGETHER: Discard, reselection, and second-run purity validate one two-run boundary.
// STATE:        Pure browser-observation and result fixtures
// RULES:        Cleared first-run evidence must be absent while setup remains reusable.
// PROVENANCE:   Runner post-stop Clear-capture field acceptance

import assert from "node:assert/strict";
import test from "node:test";

import {
  expectedRunnerSetup, runnerClearFindings, runnerFreshSetupFindings,
  runnerSecondRunFindings,
} from "./runner_browser_clear.mjs";

test("Runner Clear findings require discarded evidence and retained setup", () => {
  const profile = "phone";
  const surveyId = "survey-1";
  const valid = {
    activeLeg: -1,
    consent: true,
    downloaded: false,
    fields: expectedRunnerSetup(profile),
    finishHidden: true,
    markerRemovals: 1,
    pollCount: 0,
    preflightHidden: true,
    runHidden: true,
    sources: { route: 0, stops: 0, trail: 0, trailPoints: 0, waypoints: 0 },
    survey: "",
  };
  assert.deepEqual(runnerClearFindings(valid, profile, surveyId), []);
  assert.deepEqual(runnerClearFindings(
    { ...valid, pollCount: 1, survey: "unexpected" },
    profile,
    surveyId,
  ), [
    "Clear capture retained poll count",
    "Clear capture left an unexpected survey selection",
  ]);
});

test("Runner fresh setup and final result exclude the cleared first run", () => {
  assert.deepEqual(runnerFreshSetupFindings({
    goDisabled: true,
    pollCount: 0,
    preflightDisabled: false,
    preflightHidden: true,
    routeFeatures: 2,
    survey: "survey-1",
  }, "survey-1"), []);
  const result = {
    events: [{ type: "run-started" }, { type: "run-completed" }],
    notes: [],
    polls: [{ success: true }],
  };
  assert.deepEqual(runnerSecondRunFindings(result), []);
  assert.deepEqual(runnerSecondRunFindings({
    ...result,
    events: [...result.events, { type: "run-aborted" }],
    polls: [{ success: false }],
  }), [
    "cleared first-run lifecycle leaked into final result",
    "cleared first-run polls leaked into final result",
  ]);
});
