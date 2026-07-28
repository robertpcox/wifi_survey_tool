import assert from "node:assert/strict";
import test from "node:test";

import {
  createCreatorControllerState,
  nextCreatorStopId,
} from "./controller-state.mjs";

test("Creator controller state starts empty and allocates unused stop IDs", () => {
  const state = createCreatorControllerState();
  assert.deepEqual(state.stops, []);
  assert.equal(state.route.distanceM, 0);
  assert.equal(nextCreatorStopId(state), "stop-1");
  state.stops.push({ id: "stop-2" });
  assert.equal(nextCreatorStopId(state), "stop-1");
  state.stops.push({ id: "stop-1" });
  assert.equal(nextCreatorStopId(state), "stop-3");
});
