import assert from "node:assert/strict";
import test from "node:test";

import { createActiveRunner } from "./active-run.mjs";

function definition(dwell = 0) {
  return {
    meta: { route: { checkpointDwellSeconds: dwell } },
    route: {
      checkpoints: [
        { id: "a", sequence: 0, lng: 1, lat: 2, z: 1 },
        { id: "b", sequence: 1, lng: 3, lat: 4, z: 1 },
      ],
    },
  };
}

function harness(dwell = 0) {
  const calls = { finishes: [], renders: 0, starts: 0, stops: 0, draws: 0 };
  let time = 0;
  const timers = [];
  const runner = createActiveRunner({
    definition: definition(dwell),
    nowDate: () => new Date(Date.UTC(2026, 6, 28, 1, 0, time++)),
    pollLoop: {
      start: () => calls.starts++,
      stop: () => calls.stops++,
    },
    mapAdapter: { drawWaypoints: () => calls.draws++ },
    onFinish: state => calls.finishes.push(state.completionStatus),
    onRender: () => calls.renders++,
    setTimer: (callback, delay) => {
      timers.push({ callback, delay });
      return timers.length;
    },
    clearTimer() {},
  });
  return { calls, runner, timers };
}

test("active run completes the embedded sequence and prompts finish", () => {
  const { calls, runner } = harness();
  runner.start();
  runner.checkIn();
  runner.checkIn();
  assert.equal(runner.state.completionStatus, "completed");
  assert.deepEqual(runner.state.progress.checkIns.map(item => item.checkpointId), ["a", "b"]);
  assert.deepEqual(calls.finishes, ["completed"]);
  assert.equal(calls.starts, 1);
  assert.equal(calls.stops, 1);
  assert.ok(calls.renders >= 3);
  assert.ok(calls.draws >= 3);
});

test("stop before the first checkpoint produces an aborted run", () => {
  const { calls, runner } = harness();
  runner.start();
  runner.stop();
  assert.equal(runner.state.completionStatus, "aborted");
  assert.deepEqual(runner.state.progress.checkIns, []);
  assert.deepEqual(calls.finishes, ["aborted"]);
});

test("configured dwell disables progression until every second ticks", async () => {
  const { runner, timers } = harness(2);
  runner.start();
  runner.checkIn();
  assert.equal(runner.state.progress.phase, "dwelling");
  assert.equal(timers[0].delay, 1000);
  await timers[0].callback();
  assert.equal(runner.state.progress.dwellRemainingSeconds, 1);
  await timers[1].callback();
  assert.equal(runner.state.progress.currentIndex, 1);
  assert.equal(runner.state.progress.phase, "walking");
});
