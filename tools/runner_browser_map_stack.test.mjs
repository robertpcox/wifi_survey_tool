// FEATURE:      Runner map stacking and floor-control acceptance tests
// SURFACE:      runnerMapStackFindings()
// WHY TOGETHER: Exact SDK placement and insertion observations form one pure fixture.
// STATE:        Browser-observation fixtures
// RULES:        Valid launch and relaunch snapshots are silent.
// PROVENANCE:   Runner field feedback for 3D stacking and hidden floor control

import assert from "node:assert/strict";
import test from "node:test";

import { runnerMapStackFindings } from "./runner_browser_map_stack.mjs";

function state() {
  return {
    floorControls: [{
      options: { autoUpdate: true, maxHeight: 400 },
      placement: "middle-right",
    }],
    layerPlacements: {
      "route-active-lyr": "mm-walls-extrusion",
      "route-lines-lyr": "mm-walls-extrusion",
      "stop-pts-lyr": null,
      "wp-pts-lyr": null,
    },
    zLevelControl: false,
  };
}

test("valid Runner map launch and relaunch snapshots are silent", () => {
  const initial = state();
  assert.deepEqual(runnerMapStackFindings(initial), []);
  initial.floorControls.push(structuredClone(initial.floorControls[0]));
  assert.deepEqual(runnerMapStackFindings(initial, 2), []);
});

test("Runner map findings expose bad control and overlay placement", () => {
  const invalid = state();
  invalid.floorControls[0].placement = "top-right";
  invalid.layerPlacements["route-lines-lyr"] = null;
  assert.deepEqual(runnerMapStackFindings(invalid), [
    "Runner floor bar does not match the middle-right contract",
    "route-lines-lyr is not below the wall extrusion",
  ]);
});
