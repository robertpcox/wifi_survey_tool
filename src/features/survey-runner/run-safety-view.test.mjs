// FEATURE:      Runner field-safety control tests
// SURFACE:      Node test for createRunnerSafetyView(documentRef)
// WHY TOGETHER: Navigation gating and Stop confirmation are one mobile-safety behavior.
// STATE:        Fake buttons and native-dialog lifecycle
// RULES:        Initial Stop and Cancel never invoke the destructive handler.
// PROVENANCE:   Android field safety feedback

import assert from "node:assert/strict";
import test from "node:test";
import {
  awaitingEndText,
  createRunnerSafetyView,
} from "./run-safety-view.mjs";

function harness() {
  const selectors = [
    '[data-action="back-checkpoint"]',
    '[data-action="skip-checkpoint"]',
    '[data-action="stop"]',
    '[data-action="cancel-stop"]',
    '[data-action="confirm-stop"]',
    "[data-stop-dialog]",
  ];
  const nodes = new Map(selectors.map(selector => [selector, {
    addEventListener(type, handler) { this.listeners[type] = handler; },
    close() { this.open = false; },
    disabled: false,
    focus() { this.focused = true; },
    hidden: false,
    listeners: {},
    open: false,
    showModal() { this.open = true; },
  }]));
  return {
    nodes,
    view: createRunnerSafetyView({
      querySelector: selector => nodes.get(selector) ?? null,
    }),
  };
}

test("Stop requires confirmation while Cancel keeps recording", () => {
  const { nodes, view } = harness();
  let stops = 0;
  view.bind({ back() {}, skip() {}, stop: () => stops++ });
  nodes.get('[data-action="stop"]').listeners.click();
  assert.equal(nodes.get("[data-stop-dialog]").open, true);
  assert.equal(nodes.get('[data-action="cancel-stop"]').focused, true);
  assert.equal(stops, 0);
  nodes.get('[data-action="cancel-stop"]').listeners.click();
  assert.equal(nodes.get("[data-stop-dialog]").open, false);
  assert.equal(stops, 0);
  nodes.get('[data-action="stop"]').listeners.click();
  nodes.get('[data-action="confirm-stop"]').listeners.click();
  assert.equal(nodes.get("[data-stop-dialog]").open, false);
  assert.equal(stops, 1);
});

test("Back and Skip follow active progress safety state", () => {
  const { nodes, view } = harness();
  const state = {
    note: null,
    progress: {
      checkIns: [],
      checkpoints: [{}, {}],
      currentIndex: 0,
      history: [],
      phase: "walking",
    },
  };
  view.render(state);
  assert.equal(nodes.get('[data-action="back-checkpoint"]').disabled, true);
  assert.equal(nodes.get('[data-action="skip-checkpoint"]').disabled, false);
  state.progress.history.push({ outcome: "skipped" });
  state.progress.currentIndex = 1;
  view.render(state);
  assert.equal(nodes.get('[data-action="back-checkpoint"]').disabled, false);
  assert.equal(nodes.get('[data-action="skip-checkpoint"]').disabled, true);
  state.progress.checkIns.push({ checkpointId: "a" });
  view.render(state);
  assert.equal(nodes.get('[data-action="skip-checkpoint"]').disabled, false);
  state.progress.phase = "awaiting-end";
  view.render(state);
  assert.equal(nodes.get('[data-action="skip-checkpoint"]').hidden, true);
  assert.equal(nodes.get('[data-action="stop"]').hidden, true);
  assert.match(awaitingEndText(state.progress), /Route sequence complete/);
  state.progress.history.at(-1).outcome = "reached";
  assert.match(awaitingEndText(state.progress), /At endpoint/);
});
