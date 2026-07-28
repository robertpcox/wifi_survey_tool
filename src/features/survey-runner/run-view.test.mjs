import assert from "node:assert/strict";
import test from "node:test";

import {
  createRunnerRunView,
  targetName,
} from "./run-view.mjs";

function harness() {
  const selectors = [
    "[data-run-panel]", "[data-run-progress]", "[data-current-target]",
    "[data-current-floor]", "[data-dwell-countdown]",
    '[data-action="check-in"]', "[data-poll-count]", "[data-poll-state]",
    "[data-source-health]", "[data-finish-panel]", "[data-finish-status]",
    '[data-action="stop"]', '[data-action="download-result"]',
    "[data-result-file]", "[data-operator-comment]", "[data-validation-result]",
  ];
  const nodes = new Map(selectors.map(selector => [selector, {
    addEventListener() {},
    dataset: {},
    disabled: false,
    hidden: true,
    textContent: "",
    value: "",
  }]));
  return {
    nodes,
    view: createRunnerRunView({
      querySelector: selector => nodes.get(selector) ?? null,
    }),
  };
}

test("run view shows target, progress, dwell, source health, and finish paths", () => {
  const { nodes, view } = harness();
  const state = {
    progress: {
      checkpoints: [
        { type: "stop", stopId: "stop-a", sequence: 0, z: 1 },
        { type: "intermediate", sequence: 1, z: 1 },
      ],
      currentIndex: 0,
      phase: "walking",
      dwellRemainingSeconds: 0,
    },
  };
  view.renderRun(state);
  assert.equal(nodes.get("[data-run-progress]").textContent, "1 of 2");
  assert.equal(nodes.get("[data-current-target]").textContent, "Stop: stop-a");
  assert.equal(nodes.get('[data-action="check-in"]').disabled, false);
  state.progress.phase = "dwelling";
  state.progress.dwellRemainingSeconds = 4;
  view.renderRun(state);
  assert.equal(nodes.get("[data-dwell-countdown]").textContent, "4 s dwell");
  assert.equal(nodes.get('[data-action="check-in"]').disabled, true);
  view.renderSource({ success: false, error: "wrong base" }, 3);
  assert.equal(nodes.get("[data-source-health]").textContent, "wrong base");
  view.showFinish("aborted");
  assert.match(nodes.get("[data-finish-status]").textContent, /stopped early/);
});

test("comment and validation viewer stay optional", () => {
  const { nodes, view } = harness();
  nodes.get("[data-operator-comment]").value = "Quiet walk";
  assert.equal(view.comment(), "Quiet walk");
  view.showValidation({ valid: true, message: "Valid result." });
  assert.equal(nodes.get("[data-validation-result]").dataset.valid, "true");
  assert.equal(targetName({ type: "intermediate", sequence: 1 }), "Route checkpoint 2");
  assert.equal(targetName(null), "No target");
});
