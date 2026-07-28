import assert from "node:assert/strict";
import test from "node:test";

import {
  WALKING_SPEED_MPS,
  estimateRouteDuration,
} from "./route-duration-v3.mjs";

test("duration separates walking, dwell contribution, and total", () => {
  assert.equal(WALKING_SPEED_MPS, 1);
  assert.deepEqual(estimateRouteDuration({
    distanceM: 20,
    checkpointCount: 2,
    dwellSeconds: 5,
  }), {
    walkingSeconds: 20,
    dwellSeconds: 10,
    totalSeconds: 30,
  });
  assert.deepEqual(estimateRouteDuration({
    distanceM: 20,
    checkpointCount: 2,
    dwellSeconds: 5,
    walkingSpeedMps: 2,
  }), {
    walkingSeconds: 10,
    dwellSeconds: 10,
    totalSeconds: 20,
  });
});
