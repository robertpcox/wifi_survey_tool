// FEATURE:      Dynamic room definition input tests
// SURFACE:      Live floor coverage and per-stop dwell
// WHY TOGETHER: Click metadata and routed topology must produce one valid authoring input.
// STATE:        Two mapped room stops on a floor absent from the template
// RULES:        Current click floor wins while the template supplies site fallback metadata.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import assert from "node:assert/strict";
import test from "node:test";
import { dynamicDefinitionInput } from "./dynamic-survey-definition.mjs";

function stop(id, lng, dwellName) {
  return {
    id,
    name: dwellName,
    lng,
    lat: -45.8,
    z: 9,
    poiId: null,
    poiName: null,
    locationType: "room",
    provenance: { method: "map" },
    _mapContext: {
      building: { id: "new-building", name: "New Building" },
      floor: { id: "floor-9", name: "Level 09", z: 9 },
      poi: { id: null, name: dwellName },
    },
  };
}

test("live click coverage and dwell become stop-only authoring input", () => {
  const stops = [
    stop("stop-1", 170.5, "Room one"),
    stop("stop-2", 170.6, "Room two"),
  ];
  const input = dynamicDefinitionInput({
    definitionInput: {
      meta: {
        buildings: [{ id: "template", name: "Template Building" }],
        zLevels: [1],
        zLevelNames: { "1": "Level 00" },
      },
      routeId: "dynamic-route",
    },
    dwellSecondsByStopId: { "stop-1": 5, "stop-2": 15 },
  }, {
    stops,
    legs: [{
      fromStopId: "stop-1",
      toStopId: "stop-2",
      geometry: [stops[0], stops[1]],
    }],
  });
  assert.deepEqual(input.meta.zLevels, [9]);
  assert.equal(input.meta.zLevelNames["9"], "Level 09");
  assert.deepEqual(input.meta.buildings, [
    { id: "template", name: "Template Building" },
    { id: "new-building", name: "New Building" },
  ]);
  assert.deepEqual(
    input.checkpoints.map(checkpoint => checkpoint.dwellSeconds),
    [5, 15],
  );
  assert.equal(input.checkpointSpacingM, 0);
});
