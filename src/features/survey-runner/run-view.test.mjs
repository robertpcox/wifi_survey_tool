import assert from "node:assert/strict";
import test from "node:test";

import {
  checkpointDistanceText,
  createRunnerRunView,
  targetName,
} from "./run-view.mjs";

function harness() {
  const selectors = [
    "[data-run-panel]", "[data-run-progress]", "[data-current-target]",
    "[data-current-floor]", "[data-dwell-countdown]",
    '[data-action="check-in"]', "[data-poll-count]", "[data-poll-state]",
    "[data-poll-indicator]", "[data-source-health]", "[data-target-distance]",
    "[data-finish-panel]", "[data-finish-status]",
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
        {
          type: "stop",
          stopId: "stop-a",
          label: "Room A",
          floorLabel: "Level 0",
          sequence: 0,
          lng: 170.5,
          lat: -45.87,
          z: 1,
        },
        { type: "intermediate", sequence: 1, lng: 170.51, lat: -45.87, z: 1 },
      ],
      currentIndex: 0,
      phase: "walking",
      dwellRemainingSeconds: 0,
    },
  };
  view.renderSource({
    success: true,
    roundTripMs: 91,
    normalized: { lng: 170.5001, lat: -45.87, z: 1 },
  }, 2);
  view.renderRun(state);
  assert.equal(nodes.get("[data-run-progress]").textContent, "1 of 2");
  assert.equal(nodes.get("[data-current-target]").textContent, "Room A");
  assert.equal(nodes.get("[data-current-floor]").textContent, "Level 0");
  assert.equal(nodes.get("[data-poll-indicator]").dataset.state, "ok");
  assert.match(nodes.get("[data-target-distance]").textContent, /^≈ \d+ m$/);
  assert.equal(nodes.get('[data-action="check-in"]').disabled, false);
  state.progress.phase = "dwelling";
  state.progress.dwellRemainingSeconds = 4;
  view.renderRun(state);
  assert.equal(nodes.get("[data-dwell-countdown]").textContent, "4 s dwell");
  assert.equal(nodes.get('[data-action="check-in"]').disabled, true);
  view.renderSource({ success: false, error: "wrong base" }, 3);
  assert.equal(nodes.get("[data-source-health]").textContent, "wrong base");
  assert.equal(nodes.get("[data-poll-indicator]").dataset.state, "error");
  view.showFinish("aborted");
  assert.match(nodes.get("[data-finish-status]").textContent, /stopped early/);
});

test("comment and validation viewer stay optional", () => {
  const { nodes, view } = harness();
  nodes.get("[data-operator-comment]").value = "Quiet walk";
  assert.equal(view.comment(), "Quiet walk");
  view.showValidation({ valid: true, message: "Valid result." });
  assert.equal(nodes.get("[data-validation-result]").dataset.valid, "true");
  assert.equal(targetName({ type: "intermediate", sequence: 1 }), "Checkpoint 2");
  assert.equal(targetName(null), "No target");
  assert.equal(
    checkpointDistanceText(
      { normalized: { lng: 1, lat: 2, z: 1 } },
      { lng: 1, lat: 2, z: 2, floorLabel: "Level 1" },
    ),
    "Change to Level 1",
  );
});
