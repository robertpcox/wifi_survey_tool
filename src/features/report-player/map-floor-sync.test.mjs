// FEATURE:      Report Player map floor synchronization
// SURFACE:      node --test src/features/report-player/map-floor-sync.test.mjs
// WHY TOGETHER: Native, explicit, launch, listener, and cleanup cases prove one floor owner.
// STATE:        Fake adapter floor and watcher
// RULES:        Map reads win at launch; ordinary state changes never write to the map.
// PROVENANCE:   Report field feedback for multi-floor result rendering

import assert from "node:assert/strict";
import test from "node:test";

import { createMapFloorSync } from "./map-floor-sync.mjs";

test("native map changes own floor state while explicit commands write deliberately", () => {
  const mapWrites = [];
  const observed = [];
  const nativeRedraws = [];
  let adapterFloor = 1;
  let watcher = null;
  let stopped = 0;
  const adapter = {
    currentZLevel: 2,
    getMapZLevel: () => adapterFloor,
    setMapZLevel(value) {
      adapterFloor = value;
      mapWrites.push(value);
    },
    startZWatch(callback) {
      watcher = callback;
      return () => {
        watcher = null;
        stopped += 1;
        return true;
      };
    },
  };
  const sync = createMapFloorSync({
    adapter,
    initialFloor: 0,
    onNativeChange: value => nativeRedraws.push(value),
  });
  const unsubscribe = sync.onChange(value => observed.push(value));

  assert.equal(sync.start(3), 1);
  assert.equal(sync.floor, 1);
  assert.deepEqual(observed, [1]);
  assert.deepEqual(mapWrites, []);

  adapterFloor = 0;
  watcher(0);
  assert.equal(sync.floor, 0);
  assert.deepEqual(nativeRedraws, [0]);
  assert.deepEqual(mapWrites, []);

  assert.equal(sync.command(2), true);
  assert.deepEqual(mapWrites, []);
  assert.equal(sync.command(1, true), true);
  assert.deepEqual(mapWrites, [1]);
  assert.deepEqual(observed, [1, 0, 2, 1]);

  unsubscribe();
  sync.destroy();
  assert.equal(stopped, 1);
  assert.equal(watcher, null);
});

test("invalid subscribers and floors are rejected without map writes", () => {
  const sync = createMapFloorSync({
    adapter: { setMapZLevel() { throw new Error("must not write"); } },
    initialFloor: 1,
  });
  assert.throws(() => sync.onChange(null), /callback/);
  assert.equal(sync.command("not-a-floor", true), false);
  assert.equal(sync.floor, 1);
});
