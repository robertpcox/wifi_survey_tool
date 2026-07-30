// FEATURE:      Optional custom MazeMap floor control
// SURFACE:      Constructor options, attachment, relaunch, and failure behavior
// WHY TOGETHER: The default-control fallback and custom placement form one launch contract.
// STATE:        Fake SDK controls and maps
// RULES:        Only supported opt-in maps suppress the SDK default.
// PROVENANCE:   Runner field map floor selector placement

import assert from "node:assert/strict";
import test from "node:test";

import { createMazeMapFloorControl } from "./mazemap-floor-control.mjs";

test("disabled and unsupported maps preserve MazeMap's default control", () => {
  const options = { container: "map" };
  const disabled = createMazeMapFloorControl();
  assert.equal(disabled.mapOptions({
    Map: class { addControl() {} },
    ZLevelBarControl: class {},
  }, options), options);
  assert.equal(disabled.attach({}, { addControl() {} }), false);

  const enabled = createMazeMapFloorControl(true);
  assert.equal(enabled.mapOptions({}, options), options);
  assert.equal(enabled.attach({}, { addControl() {} }), false);
  assert.equal("zLevelControl" in options, false);
});

test("supported launches suppress the default and attach a fresh middle-right bar", () => {
  const bars = [];
  class ZLevelBarControl {
    constructor(options) {
      this.options = options;
      bars.push(this);
    }
  }
  const sdk = { Map: class { addControl() {} }, ZLevelBarControl };
  const placements = [];
  const floorControl = createMazeMapFloorControl(true);
  assert.deepEqual(floorControl.mapOptions(sdk, { container: "map" }), {
    container: "map",
    zLevelControl: false,
  });
  const map = {
    addControl: (bar, placement) => placements.push([bar, placement]),
  };
  assert.equal(floorControl.attach(sdk, map), true);
  assert.equal(floorControl.attach(sdk, map), true);
  assert.equal(bars.length, 2);
  assert.notEqual(bars[0], bars[1]);
  assert.deepEqual(bars[0].options, { autoUpdate: true, maxHeight: 400 });
  assert.deepEqual(placements.map(call => call[1]), ["middle-right", "middle-right"]);
});

test("construction and attachment failures stay non-fatal", () => {
  const throwingSdk = {
    Map: class { addControl() {} },
    ZLevelBarControl: class {
      constructor() { throw Error("unsupported"); }
    },
  };
  assert.equal(createMazeMapFloorControl(true).attach(
    throwingSdk,
    { addControl() {} },
  ), false);
  const sdk = {
    Map: class { addControl() {} },
    ZLevelBarControl: class {},
  };
  assert.equal(createMazeMapFloorControl(true).attach(sdk, {
    addControl() { throw Error("rejected"); },
  }), false);
});
