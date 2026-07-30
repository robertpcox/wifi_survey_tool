// FEATURE:      Runner browser 3D acceptance tests
// SURFACE:      node:test coverage for 3D and route-transition findings
// WHY TOGETHER: Launch, toggle, perspective, and direction checks exercise one acceptance helper.
// STATE:        Pure browser-observation fixtures
// RULES:        Valid 3D states are silent; mismatched pitch is reported deterministically.
// PROVENANCE:   Runner field 3D display acceptance

import assert from "node:assert/strict";
import test from "node:test";

import {
  runner3dFindings, runner3dPerspectiveFindings, runner3dRelaunchFindings,
  runnerMapTransitionFindings, runnerPitchFor3d,
} from "./runner_browser_3d.mjs";

function state(overrides = {}) {
  return {
    actionTop: 700,
    cameraPitch: 45,
    config: { animateWalls: true, show3dAssets: true },
    disabled: false,
    history: [true],
    label: "Turn 3D map off",
    launchCount: 1,
    pressed: "true",
    rect: { bottom: 650, left: 10, right: 70, top: 590 },
    viewport: { height: 844, width: 390 },
    ...overrides,
  };
}

test("Runner 3D findings cover launch, toggle calls, pitch, and geometry", () => {
  const states = {
    initial: state(),
    off: state({
      cameraPitch: 0,
      history: [true, false],
      label: "Turn 3D map on",
      pressed: "false",
    }),
    on: state({ history: [true, false, true] }),
  };
  assert.deepEqual(runner3dFindings(states), []);
  states.off.cameraPitch = 45;
  assert.deepEqual(runner3dFindings(states), [
    "checkpoint camera lost its selected 3D perspective",
  ]);
});

test("Runner 3D relaunch and transition findings derive the selected pitch", () => {
  const relaunched = state({
    history: [true, false, true, true],
    launchCount: 2,
  });
  assert.deepEqual(runner3dRelaunchFindings(relaunched), []);
  assert.equal(runnerPitchFor3d(relaunched), 45);
  assert.equal(runnerPitchFor3d({ pressed: "false" }), 0);
  assert.deepEqual(runner3dPerspectiveFindings(0, { pressed: "false" }), []);
  assert.deepEqual(runnerMapTransitionFindings(
    {
      activeLeg: 0,
      bearing: 0,
      waypointOpacity: ["==", ["get", "z"], 1],
    },
    { latitude: 0, longitude: 0 },
    { latitude: 1, longitude: 0 },
    1,
  ), []);
});
