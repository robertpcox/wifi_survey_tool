// FEATURE:      Runner selected-map presentation tests
// SURFACE:      Planned versus dynamic layer drawing
// WHY TOGETHER: Route suppression and planned drawing are one visual ownership boundary.
// STATE:        Recorded adapter calls
// RULES:        Dynamic clears every authored overlay and never fits the template route.
// PROVENANCE:   Dynamic room survey field workflow

import assert from "node:assert/strict";
import test from "node:test";
import { drawRunnerSelection } from "./setup-map.mjs";

function harness() {
  const calls = [];
  return {
    calls,
    map: {
      ready: true,
      campusId: "566",
      drawRoute: value => calls.push(["route", value]),
      drawStops: value => calls.push(["stops", value]),
      drawWaypoints: value => calls.push(["waypoints", value]),
      setActiveLeg: value => calls.push(["active", value]),
      clearTargetMarker: () => calls.push(["marker"]),
      fitRoute: value => calls.push(["fit", value]),
      resizeMapSoon: () => calls.push(["resize"]),
    },
  };
}

const definition = {
  meta: { campusId: "566" },
  route: { legs: [1], stops: [2], checkpoints: [3] },
};

test("dynamic selection clears the template route without fitting it", () => {
  const { calls, map } = harness();
  assert.equal(drawRunnerSelection(map, definition, "dynamic-room"), true);
  assert.deepEqual(calls, [
    ["route", []], ["stops", []], ["waypoints", []],
    ["active", null], ["marker"], ["resize"],
  ]);
});

test("planned selection draws and fits the exact definition", () => {
  const { calls, map } = harness();
  drawRunnerSelection(map, definition, "planned-route");
  assert.deepEqual(calls.at(-2), ["fit", definition.route]);
});
