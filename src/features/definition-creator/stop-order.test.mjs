import assert from "node:assert/strict";
import test from "node:test";

import { reorderCreatorStops } from "./stop-order.mjs";

test("stop reorder is immutable and follows the selected stop", () => {
  const stops = [{ id: "a" }, { id: "b" }, { id: "c" }];
  const moved = reorderCreatorStops(stops, 1, 1, 1);
  assert.deepEqual(moved.stops.map(stop => stop.id), ["a", "c", "b"]);
  assert.equal(moved.selectedIndex, 2);
  assert.deepEqual(stops.map(stop => stop.id), ["a", "b", "c"]);
  const crossed = reorderCreatorStops(moved.stops, 1, 1, 2);
  assert.equal(crossed.selectedIndex, 1);
});

test("stop reorder rejects invalid directions and route boundaries", () => {
  const stops = [{ id: "a" }, { id: "b" }];
  assert.throws(() => reorderCreatorStops(stops, 0, -1), /route boundary/);
  assert.throws(() => reorderCreatorStops(stops, 1, 1), /route boundary/);
  assert.throws(() => reorderCreatorStops(stops, 0, 2), /one-step direction/);
  assert.throws(() => reorderCreatorStops(stops, 4, 1), /does not exist/);
});
