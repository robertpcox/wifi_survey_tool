// FEATURE:      Safe MazeMap 3D mode state
// SURFACE:      Optional constructor config, SDK capability, and relaunch persistence
// WHY TOGETHER: One requested mode must apply consistently to replacement map instances.
// STATE:        Requested 3D state and fake maps
// RULES:        Failed SDK calls never change state; absent config stays out of map options.
// PROVENANCE:   Runner field map display control

import assert from "node:assert/strict";
import test from "node:test";

import { createMazeMap3dState } from "./mazemap-3d.mjs";

test("optional config is absent for non-Runner maps", () => {
  const state = createMazeMap3dState();
  const options = state.mapOptions("map", 566, [170.5, -45.8]);
  assert.equal("threeD" in options, false);
  assert.equal(state.enabled, false);
  assert.equal(state.pitch, 0);
  assert.equal(state.apply({ enable3d() {} }), false);
});

test("requested mode persists when the caller replaces the map", () => {
  const calls = [];
  const configuration = {
    animateWalls: true,
    show3dAssets: true,
  };
  const state = createMazeMap3dState(configuration);
  assert.deepEqual(state.mapOptions("map", 566, [1, 2]).threeD, {
    animateWalls: true,
    show3dAssets: true,
  });
  assert.equal(state.apply(fakeMap(calls, "first")), true);
  assert.equal(state.pitch, 45);
  assert.equal(state.set(fakeMap(calls, "first"), false), true);
  assert.equal(state.enabled, false);
  assert.equal(state.pitch, 0);
  assert.equal(state.apply(fakeMap(calls, "replacement")), true);
  assert.deepEqual(calls, [
    ["first", "enable", configuration],
    ["first", "disable"],
    ["replacement", "disable"],
  ]);
});

test("every enable preserves a fresh copy of the configured SDK options", () => {
  const received = [], snapshots = [];
  const state = createMazeMap3dState({
    animateWalls: true,
    show3dAssets: true,
  });
  const map = {
    disable3d() {},
    enable3d(options) {
      received.push(options);
      snapshots.push({ ...options });
      options.show3dAssets = false;
    },
  };
  assert.equal(state.apply(map), true);
  assert.equal(state.set(map, false), true);
  assert.equal(state.set(map, true), true);
  assert.deepEqual(snapshots, [
    { animateWalls: true, show3dAssets: true },
    { animateWalls: true, show3dAssets: true },
  ]);
  assert.notEqual(received[0], received[1]);
});

test("missing and throwing methods are safe and preserve requested state", () => {
  const state = createMazeMap3dState({ animateWalls: true });
  assert.equal(state.set({}, false), false);
  assert.equal(state.enabled, true);
  assert.equal(state.set({
    disable3d() { throw Error("unsupported"); },
  }, false), false);
  assert.equal(state.enabled, true);
});

test("toggle moves to the configured perspective and normalizes invalid pitch", () => {
  const cameras = [];
  const map = {
    disable3d() {},
    enable3d() {},
    easeTo(camera) { cameras.push(camera); },
  };
  const configured = createMazeMap3dState({ animateWalls: true }, 52);
  assert.equal(configured.pitch, 52);
  assert.equal(configured.set(map, false), true);
  assert.equal(configured.pitch, 0);
  assert.equal(configured.set(map, true), true);
  assert.deepEqual(cameras, [
    { pitch: 0, duration: 350 },
    { pitch: 52, duration: 350 },
  ]);
  assert.equal(createMazeMap3dState({ animateWalls: true }, "bad").pitch, 45);
  assert.equal(createMazeMap3dState({ animateWalls: true }, 100).pitch, 85);
});

function fakeMap(calls, name) {
  return {
    enable3d: options => calls.push([name, "enable", options]),
    disable3d: () => calls.push([name, "disable"]),
  };
}
