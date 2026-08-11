import test from "node:test";
import assert from "node:assert/strict";
import {
  mazeMapZ,
  normalizeCampusId,
  numericZ,
  waitForMapLoad,
} from "./mazemap-runtime.mjs";

test("runtime normalizes campus and floor identifiers", () => {
  assert.equal(normalizeCampusId("777"), 777);
  assert.throws(() => normalizeCampusId(""), /positive integer/);
  assert.throws(() => normalizeCampusId(-1), /positive integer/);
  assert.equal(numericZ("3"), 3);
  assert.equal(numericZ("no floor"), null);
  assert.equal(mazeMapZ(0, null, 3), 3);
  assert.equal(mazeMapZ(undefined), 1);
});

test("map load resolves on load and rejects SDK errors or timeout", async () => {
  const map = {
    events: {},
    on(event, listener) { this.events[event] = listener; },
  };
  const loaded = waitForMapLoad(map, 50);
  map.events.load();
  await loaded;
  const failedMap = {
    on(event, listener) {
      if (event === "error") listener({ error: Error("catalog unavailable") });
    },
  };
  await assert.rejects(
    waitForMapLoad(failedMap, 50),
    /MazeMap failed to load: catalog unavailable/,
  );
  const stalledMap = { on() {} };
  await assert.rejects(waitForMapLoad(stalledMap, 5), /within 5 ms/);
});
