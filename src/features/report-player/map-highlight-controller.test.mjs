// FEATURE:      Report Player map highlight choice
// SURFACE:      node --test src/features/report-player/map-highlight-controller.test.mjs
// WHY TOGETHER: One small DOM fixture proves mode, limit, legend, and callback synchronization.
// STATE:        In-memory control elements
// RULES:        Exactly one threshold and one matching legend are visible.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import assert from "node:assert/strict";
import test from "node:test";

import { bindMapHighlight } from "./map-highlight-controller.mjs";

test("highlight choice presents only its matching threshold and legend", () => {
  const input = control("sticky");
  const thresholds = [item("sticky"), item("accuracy")];
  const legends = [
    item("freeze"), item("sticky"), item("lag"), item("accuracy"), item("room"),
  ];
  const changes = [];
  const root = {
    querySelector: () => input,
    querySelectorAll(selector) {
      return selector.includes("threshold") ? thresholds : legends;
    },
  };
  const highlight = bindMapHighlight({
    root,
    onChange: kind => changes.push(kind),
  });
  assert.equal(highlight.kind, "sticky");
  assert.deepEqual(thresholds.map(value => value.hidden), [false, true]);
  assert.deepEqual(legends.map(value => value.hidden), [true, false, true, true, true]);

  input.value = "accuracy";
  input.change();
  assert.equal(highlight.kind, "accuracy");
  assert.deepEqual(thresholds.map(value => value.hidden), [true, false]);
  assert.deepEqual(legends.map(value => value.hidden), [true, true, true, false, true]);
  assert.deepEqual(changes, ["accuracy"]);
  assert.equal(highlight.setKind("lag"), "lag");
  assert.deepEqual(thresholds.map(value => value.hidden), [true, true]);
  assert.deepEqual(legends.map(value => value.hidden), [true, true, false, true, true]);
  assert.equal(highlight.setKind("room"), "room");
  assert.deepEqual(thresholds.map(value => value.hidden), [true, true]);
  assert.deepEqual(legends.map(value => value.hidden), [true, true, true, true, false]);
  assert.equal(highlight.setKind("freeze"), "freeze");
  assert.deepEqual(thresholds.map(value => value.hidden), [false, true]);
  assert.deepEqual(legends.map(value => value.hidden), [false, true, true, true, true]);
});

function control(value) {
  let listener = () => {};
  return {
    value,
    addEventListener(type, next) {
      if (type === "change") listener = next;
    },
    change() { listener(); },
  };
}

function item(kind) {
  return {
    hidden: false,
    dataset: {
      highlightThreshold: kind,
      highlightLegend: kind,
    },
  };
}
