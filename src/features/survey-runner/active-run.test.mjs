import assert from "node:assert/strict";
import test from "node:test";

import { createActiveRunner } from "./active-run.mjs";

function definition(dwell = 0) {
  return {
    meta: { route: { checkpointDwellSeconds: dwell } },
    route: {
      stops: [
        { id: "s1", z: 1 },
        { id: "s2", z: 2 },
      ],
      legs: [
        { id: "leg-1", fromStopId: "s1", toStopId: "s2" },
      ],
      checkpoints: [
        { id: "a", sequence: 0, stopId: "s1", lng: 1, lat: 2, z: 1 },
        { id: "b", sequence: 1, stopId: "s2", lng: 3, lat: 4, z: 2 },
      ],
    },
  };
}

function harness(dwell = 0, definitionInput = definition(dwell)) {
  const calls = {
    finishes: [],
    floors: [],
    focuses: [],
    focusOrigins: [],
    legs: [],
    renders: 0,
    starts: 0,
    stops: 0,
    draws: 0,
  };
  let time = 0;
  const timers = [];
  const runner = createActiveRunner({
    definition: definitionInput,
    currentPosition: () => ({ id: "live", lng: 0, lat: 0 }),
    nowDate: () => new Date(Date.UTC(2026, 6, 28, 1, 0, time++)),
    pollLoop: { start: () => calls.starts++, stop: () => calls.stops++ },
    mapAdapter: {
      drawWaypoints: () => calls.draws++,
      focusWaypoint: (checkpoint, view) => {
        calls.focuses.push(checkpoint.id);
        calls.focusOrigins.push(view.origin.id);
      },
      setActiveLeg: index => calls.legs.push(index),
      setMapZLevel: z => calls.floors.push(z),
    },
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

test("active run records at the endpoint until the operator ends the session", () => {
  const { calls, runner } = harness();
  runner.start();
  runner.checkIn();
  runner.checkIn();
  assert.equal(runner.state.completionStatus, null);
  assert.equal(runner.state.progress.phase, "awaiting-end");
  assert.equal(calls.stops, 0);
  assert.deepEqual(calls.finishes, []);
  runner.endSession();
  runner.endSession();
  assert.equal(runner.state.completionStatus, "completed");
  assert.deepEqual(runner.state.progress.checkIns.map(item => item.checkpointId), ["a", "b"]);
  assert.deepEqual(calls.finishes, ["completed"]);
  assert.equal(calls.starts, 1);
  assert.equal(calls.stops, 1);
  assert.deepEqual(calls.focuses, ["a", "b"]);
  assert.deepEqual(calls.focusOrigins, ["live", "a"]);
  assert.deepEqual(calls.floors, [1, 2]);
  assert.deepEqual(calls.legs, [0, 0]);
  assert.deepEqual(
    runner.state.events.map(event => event.type),
    ["run-started", "checkpoint-reached", "checkpoint-reached",
      "endpoint-hold-started", "run-completed"],
  );
});

test("stop before the first checkpoint produces an aborted run", () => {
  const { calls, runner } = harness();
  runner.start();
  runner.stop();
  assert.equal(runner.state.completionStatus, "aborted");
  assert.deepEqual(runner.state.progress.checkIns, []);
  assert.deepEqual(calls.finishes, ["aborted"]);
});

test("configured dwell disables progression without refocusing the target", async () => {
  const { calls, runner, timers } = harness(2);
  runner.start();
  runner.checkIn();
  assert.equal(runner.state.progress.phase, "dwelling");
  assert.deepEqual(calls.focuses, ["a"]);
  assert.equal(timers[0].delay, 1000);
  await timers[0].callback();
  assert.equal(runner.state.progress.dwellRemainingSeconds, 1);
  assert.deepEqual(calls.focuses, ["a"]);
  await timers[1].callback();
  assert.equal(runner.state.progress.currentIndex, 1);
  assert.equal(runner.state.progress.phase, "walking");
  assert.deepEqual(calls.focuses, ["a", "b"]);
});

test("active route advances to the leg attached to the next checkpoint", () => {
  const multiLeg = definition();
  multiLeg.route.stops.push({ id: "s3", z: 2 });
  multiLeg.route.legs.push({
    id: "leg-2",
    fromStopId: "s2",
    toStopId: "s3",
  });
  multiLeg.route.checkpoints.splice(1, 0, {
    id: "on-leg-1",
    sequence: 1,
    legId: "leg-1",
    lng: 2,
    lat: 3,
    z: 1,
  });
  multiLeg.route.checkpoints[2].sequence = 2;
  multiLeg.route.checkpoints.push({
    id: "on-leg-2",
    sequence: 3,
    legId: "leg-2",
    lng: 4,
    lat: 5,
    z: 2,
  });
  const { calls, runner } = harness(0, multiLeg);
  runner.start();
  runner.checkIn();
  runner.checkIn();
  runner.checkIn();
  assert.deepEqual(calls.focuses, ["a", "on-leg-1", "b", "on-leg-2"]);
  assert.deepEqual(calls.focusOrigins, ["live", "a", "on-leg-1", "b"]);
  assert.deepEqual(calls.floors, [1, 1, 2, 2]);
  assert.deepEqual(calls.legs, [0, 0, 0, 1]);
});
