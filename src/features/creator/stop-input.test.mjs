import assert from "node:assert/strict";
import test from "node:test";

import { createStopInput } from "./stop-input.mjs";

test("createStopInput preserves coordinate and POI input outcomes", async () => {
  const input = { value: "" };
  const statuses = [];
  const added = [];
  const view = {
    setStatus: (...value) => statuses.push(value),
    stopInput: () => input,
  };
  const Mazemap = {
    Data: {
      getPoi: async id => {
        if (id === 9) throw new Error("offline");
        if (id === 8) {
          return {
            geometry: { coordinates: [], type: "LineString" },
            properties: { poiId: id, title: "No point" },
          };
        }
        return {
          point: { coordinates: [174.765, -36.855] },
          properties: { poiId: id, title: "Library", zLevel: 2 },
        };
      },
    },
  };
  const stopInput = createStopInput({
    Mazemap,
    addRouteStop: stop => added.push(stop),
    view,
  });
  input.value = "-36.850, 174.760, 3, outdoors";
  await stopInput.addStopFromInput();
  assert.equal(input.value, "");
  assert.deepEqual(
    {
      label: added[0].label,
      locationType: added[0].locationType,
      poiId: added[0].poiId,
      targetType: added[0].targetType,
      z: added[0].z,
    },
    {
      label: "Outdoors — -36.850000, 174.760000",
      locationType: "outdoors",
      poiId: null,
      targetType: "point",
      z: 3,
    },
  );
  assert.deepEqual(statuses.at(-1), [
    "ok",
    "Stop added — build the route when ready",
  ]);
  input.value = "-36.851,174.761,2,null";
  await stopInput.addStopFromInput();
  assert.equal(added[1].locationType, "unknown");
  assert.equal(added[1].z, 2);
  input.value = "-36.852,174.762,1,inside";
  await stopInput.addStopFromInput();
  assert.equal(added.length, 2);
  assert.deepEqual(statuses.at(-1), [
    "err",
    "The optional fourth value must be outdoors or null",
  ]);
  assert.equal(input.value, "-36.852,174.762,1,inside");
  input.value = "not a stop";
  await stopInput.addStopFromInput();
  assert.match(statuses.at(-1)[1], /numeric POI ID or lat,lng/);
  input.value = "7";
  await stopInput.addStopFromInput();
  assert.equal(added[2].poiId, 7);
  assert.equal(added[2].label, "Library");
  assert.equal(added[2].targetType, "poi");
  assert.equal(input.value, "");
  input.value = "8";
  await stopInput.addStopFromInput();
  assert.equal(added.length, 3);
  assert.deepEqual(statuses.at(-1), [
    "err",
    "POI 8: no usable geometry",
  ]);
  assert.equal(input.value, "8");
  input.value = "9";
  await stopInput.addStopFromInput();
  assert.equal(added.length, 3);
  assert.deepEqual(statuses.at(-1), [
    "err",
    "POI 9 lookup failed: offline",
  ]);
  input.value = "   ";
  await stopInput.addStopFromInput();
  assert.equal(added.length, 3);
});
