// FEATURE:      Report map floor synchronization
// SURFACE:      node --test src/features/report-player/report-floor-controller.test.mjs
// WHY TOGETHER: Native floor, explicit selection, and Player Follow directionality form one contract.
// STATE:        Fake floor input and map surface
// RULES:        Ordinary Player frames never force a stale Report floor.
// PROVENANCE:   Scope/steps/05b_improve_report.md floor correction

import assert from "node:assert/strict";
import test from "node:test";

import {
  bindReportFloor,
  renderPlayerFrame,
} from "./report-floor-controller.mjs";

test("native MazeMap floor synchronizes Report selection continuously", () => {
  const calls = [];
  let mapListener;
  let removed = false;
  const input = listenerInput("0");
  const floor = bindReportFloor({
    floorInput: input,
    initialFloor: 0,
    surface: {
      onFloorChange(listener) {
        mapListener = listener;
        return () => { removed = true; };
      },
      render: value => calls.push(value),
    },
  });
  mapListener(1);
  assert.equal(floor.floor, 1);
  assert.equal(input.value, "1");
  input.value = "0";
  input.change({ target: input });
  assert.deepEqual(calls, [{ floor: 0 }]);
  floor.destroy();
  assert.equal(removed, true);
});

test("Follow commands walker floor while Follow-off only renders evidence", () => {
  const calls = [];
  const surface = {
    followWalker: value => calls.push(["follow", value]),
    render: value => calls.push(["render", value]),
  };
  const floorInput = { value: "0" };
  const first = { atMs: 1, walker: { lng: 170.1, lat: -45.1, z: 1 } };
  const floor = renderPlayerFrame({
    floor: 0,
    floorInput,
    frame: first,
    options: { follow: true, snap: null },
    surface,
  });
  assert.equal(floor, 1);
  assert.equal(floorInput.value, "1");
  assert.deepEqual(calls[0], ["follow", first.walker]);
  assert.equal(calls[1][1].floor, 1);
  const second = { atMs: 2, walker: { lng: 170.2, lat: -45.2, z: 0 } };
  assert.equal(renderPlayerFrame({
    floor,
    floorInput,
    frame: second,
    options: { follow: false, snap: null },
    surface,
  }), 1);
  assert.equal(calls.filter(call => call[0] === "follow").length, 1);
  assert.equal(Object.hasOwn(calls.at(-1)[1], "floor"), false);
});

function listenerInput(value) {
  return {
    value,
    addEventListener(name, listener) { this[name] = listener; },
  };
}
