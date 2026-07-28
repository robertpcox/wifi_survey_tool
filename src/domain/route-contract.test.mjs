import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMPUS_ID,
  CHECKPOINT_RULES,
  MAP_STYLE,
  MAP_TRAIL_FIX_LIMIT,
  ROUTE_BUILD_CONCURRENCY,
  ROUTE_FORMAT_VERSION,
  ROUTE_TOOL,
  SUPPORTED_SPACINGS_M,
} from "./route-contract.mjs";

test("route contract preserves every extracted constant", () => {
  assert.equal(CAMPUS_ID, 566);
  assert.equal(ROUTE_FORMAT_VERSION, 2);
  assert.equal(ROUTE_TOOL, "route_survey");
  assert.deepEqual(CHECKPOINT_RULES, {
    minimumGapM: 6,
    turnDegrees: 35,
  });
  assert.deepEqual(SUPPORTED_SPACINGS_M, [5, 10, 15, 20, 30, 0]);
  assert.deepEqual(MAP_STYLE, {
    cloud: "#2563eb",
    lipi: "#9333ea",
    route: "#111827",
    waypointDone: "#16a34a",
    waypointPending: "#98a2b3",
    waypointSkipped: "#ef4444",
    waypointCurrent: "#f59e0b",
  });
  assert.equal(ROUTE_BUILD_CONCURRENCY, 4);
  assert.equal(MAP_TRAIL_FIX_LIMIT, 300);
  assert.ok(Object.isFrozen(CHECKPOINT_RULES));
  assert.ok(Object.isFrozen(SUPPORTED_SPACINGS_M));
  assert.ok(Object.isFrozen(MAP_STYLE));
});
