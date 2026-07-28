import assert from "node:assert/strict";
import test from "node:test";

import { renderCreatorController } from "./controller-render.mjs";

test("controller rendering recomputes committed coverage and map overlays", () => {
  const calls = [];
  const context = {
    building: { id: "101", name: "Building A" },
    floor: { id: "501", name: "Ground", z: 0 },
  };
  const state = {
    imported: null,
    route: {
      checkpoints: [{ id: "checkpoint-1" }],
      legs: [],
      shortLegs: [],
    },
    selectedIndex: -1,
    shortWarningDismissed: false,
    stops: [{
      id: "stop-1",
      z: 0,
      _mapContext: context,
    }],
  };
  const view = {
    renderCoverage: value => calls.push(["coverage", value]),
    renderRoute: (...value) => calls.push(["route", value]),
    renderStops: (...value) => calls.push(["stops", value]),
    showShortWarning: value => calls.push(["warning", value]),
  };
  const mapAdapter = {
    drawRoute: value => calls.push(["map-route", value]),
    drawStops: value => calls.push(["map-stops", value]),
    drawWaypoints: value => calls.push(["map-checkpoints", value]),
  };
  renderCreatorController({ mapAdapter, state, view });
  assert.deepEqual(calls.find(call => call[0] === "coverage")[1], {
    buildings: [{ id: "101", name: "Building A" }],
    zLevels: [0],
    zLevelNames: { 0: "Ground" },
  });
  assert.ok(calls.some(call => call[0] === "map-stops"));
  assert.deepEqual(calls.find(call => call[0] === "warning")[1], null);
});
