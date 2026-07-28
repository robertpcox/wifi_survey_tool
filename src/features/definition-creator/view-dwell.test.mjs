// FEATURE:      Creator dwell schedule
// SURFACE:      Dwell schedule rendering and input tests
// WHY TOGETHER: Markup grouping and value lookup share checkpoint sequence identity.
// STATE:        In-memory rendered markup
// RULES:        Tests exclude route start, expose timed arrivals, and label manual finish.
// PROVENANCE:   Scope/steps/03_build_creator.md

import assert from "node:assert/strict";
import test from "node:test";

import {
  readCreatorCheckpointDwell,
  renderCreatorDwellSchedule,
} from "./view-dwell.mjs";

test("dwell schedule groups editable mid-leg and endpoint check-ins by leg", () => {
  let markup = "";
  const find = () => ({
    set innerHTML(value) { markup = value; },
  });
  renderCreatorDwellSchedule(find, [
    { id: "a", name: "Start" },
    { id: "b", name: "Finish" },
  ], {
    legacyDwellSeconds: 9,
    legs: [{ id: "leg-1", fromStopId: "a", toStopId: "b" }],
    checkpoints: [
      { sequence: 0, type: "stop", stopId: "a", legId: null },
      {
        sequence: 1,
        type: "intermediate",
        stopId: null,
        legId: "leg-1",
        dwellSeconds: 5,
      },
      {
        sequence: 2,
        type: "stop",
        stopId: "b",
        legId: null,
        dwellSeconds: 30,
      },
    ],
  });
  assert.match(markup, /Leg 1/);
  assert.match(markup, /Start[\s\S]*→[\s\S]*Finish/);
  assert.match(markup, /Check-in 1 · mid-leg/);
  assert.match(markup, /Session end · Finish/);
  assert.match(markup, /keeps polling until the operator finishes/);
  assert.match(markup, /data-checkpoint-dwell="1"[\s\S]*value="5"/);
  assert.doesNotMatch(markup, /data-checkpoint-dwell="2"/);
  assert.doesNotMatch(markup, /data-checkpoint-dwell="0"/);
});

test("dwell input reader selects the requested checkpoint", () => {
  const root = {
    querySelector: selector => (
      selector === '[data-checkpoint-dwell="2"]' ? { value: "30" } : null
    ),
  };
  assert.equal(readCreatorCheckpointDwell(root, 2), "30");
});
