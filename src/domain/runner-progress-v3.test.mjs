import assert from "node:assert/strict";
import test from "node:test";

import {
  checkInCurrent,
  createRunnerProgress,
  finishRunnerProgress,
  startRunnerProgress,
  tickRunnerDwell,
} from "./runner-progress-v3.mjs";

function definition(dwellSeconds = 2) {
  return {
    meta: {
      route: { checkpointDwellSeconds: dwellSeconds },
      zLevelNames: { "3": "Level 2", "6": "Level 5" },
    },
    route: {
      stops: [{ id: "stop-a", name: "Room A" }],
      checkpoints: [
        {
          id: "a",
          sequence: 0,
          type: "stop",
          stopId: "stop-a",
          lng: 1,
          lat: 2,
          z: 3,
        },
        { id: "b", sequence: 1, lng: 4, lat: 5, z: 6 },
      ],
    },
  };
}

test("checkpoint sequence and dwell countdown come from the definition", () => {
  const progress = startRunnerProgress(createRunnerProgress(definition(2)));
  assert.equal(progress.checkpoints[0].state, "current");
  assert.equal(progress.checkpoints[0].label, "Room A");
  assert.equal(progress.checkpoints[1].label, "Checkpoint 2");
  assert.equal(progress.checkpoints[0].floorLabel, "Level 2");
  assert.equal(progress.checkpoints[1].floorLabel, "Level 5");
  assert.equal(progress.dwellSeconds, 2);
  assert.deepEqual(
    checkInCurrent(progress, "2026-07-28T01:00:00.000Z"),
    { completed: false, changed: true },
  );
  assert.equal(progress.phase, "dwelling");
  assert.equal(progress.dwellRemainingSeconds, 2);
  tickRunnerDwell(progress);
  assert.equal(progress.dwellRemainingSeconds, 1);
  const advanced = tickRunnerDwell(progress);
  assert.equal(advanced.completed, false);
  assert.equal(progress.currentIndex, 1);
  assert.equal(progress.checkpoints[1].state, "current");
  checkInCurrent(progress, "2026-07-28T01:00:03.000Z");
  assert.equal(progress.phase, "awaiting-end");
  assert.equal(finishRunnerProgress(progress).completed, true);
  assert.equal(progress.phase, "completed");
  assert.deepEqual(progress.checkIns.map(item => item.checkpointId), ["a", "b"]);
  assert.deepEqual(progress.checkIns[0].groundTruth, { lng: 1, lat: 2, z: 3 });
});

test("zero configured dwell advances without a Runner default", () => {
  const progress = startRunnerProgress(createRunnerProgress(definition(0)));
  assert.equal(
    checkInCurrent(progress, "2026-07-28T01:00:00.000Z").completed,
    false,
  );
  assert.equal(progress.currentIndex, 1);
  assert.equal(
    checkInCurrent(progress, "2026-07-28T01:00:01.000Z").completed,
    false,
  );
  assert.equal(progress.phase, "awaiting-end");
  assert.equal(tickRunnerDwell(progress).changed, false);
});

test("Runner obeys each checkpoint dwell and falls back for legacy surveys", () => {
  const value = definition(9);
  value.route.checkpoints = [
    { ...value.route.checkpoints[0], dwellSeconds: 0 },
    {
      ...value.route.checkpoints[1],
      type: "intermediate",
      dwellSeconds: 5,
    },
    {
      ...value.route.checkpoints[0],
      id: "c",
      sequence: 2,
      dwellSeconds: 30,
    },
    {
      ...value.route.checkpoints[0],
      id: "d",
      sequence: 3,
      dwellSeconds: 99,
    },
  ];
  const progress = startRunnerProgress(createRunnerProgress(value));
  checkInCurrent(progress, "2026-07-28T01:00:00.000Z");
  assert.equal(progress.currentIndex, 1);
  checkInCurrent(progress, "2026-07-28T01:00:01.000Z");
  assert.equal(progress.dwellRemainingSeconds, 5);
  for (let index = 0; index < 5; index++) tickRunnerDwell(progress);
  checkInCurrent(progress, "2026-07-28T01:00:07.000Z");
  assert.equal(progress.dwellRemainingSeconds, 30);
  for (let index = 0; index < 30; index++) tickRunnerDwell(progress);
  checkInCurrent(progress, "2026-07-28T01:00:38.000Z");
  assert.equal(progress.dwellRemainingSeconds, 0);
  assert.equal(progress.phase, "awaiting-end");
});
