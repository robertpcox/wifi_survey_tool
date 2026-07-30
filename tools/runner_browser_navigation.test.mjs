// FEATURE:      Runner mobile checkpoint navigation acceptance tests
// SURFACE:      Node test for runnerNavigationFindings(trace)
// WHY TOGETHER: Browser trace diagnostics belong to their checkpoint correction journey.
// STATE:        None
// RULES:        Each failed transition names the field-visible regression.
// PROVENANCE:   Android field safety and closed-area Runner feedback

import assert from "node:assert/strict";
import test from "node:test";
import { runnerNavigationFindings } from "./runner_browser_navigation.mjs";

function trace() {
  const box = { bottom: 80, left: 10, right: 100, top: 10 };
  return {
    checkpointCount: 3,
    doubleTap: {
      back: box,
      marker: "2",
      navigation: box,
      progress: "2 of 3",
      skip: box,
      viewport: { height: 800, width: 400 },
    },
    backed: { marker: "1", progress: "1 of 3" },
    skipped: { marker: "2", progress: "2 of 3", states: ["skipped"] },
    restored: { marker: "1", progress: "1 of 3", states: ["current"] },
  };
}

test("valid mobile checkpoint correction trace has no findings", () => {
  assert.deepEqual(runnerNavigationFindings(trace()), []);
});

test("each broken navigation transition is reported", () => {
  const value = trace();
  value.doubleTap.progress = "3 of 3";
  value.doubleTap.navigation = { ...value.doubleTap.navigation, bottom: 900 };
  value.backed.marker = "2";
  value.skipped.states = ["done"];
  value.restored.states = ["skipped"];
  assert.deepEqual(runnerNavigationFindings(value), [
    "double-tap advanced more than one checkpoint",
    "checkpoint navigation leaves the mobile viewport",
    "Back did not reopen the reached checkpoint",
    "closed-area Skip did not advance with exception styling",
    "Back did not remove the temporary skip",
  ]);
});
