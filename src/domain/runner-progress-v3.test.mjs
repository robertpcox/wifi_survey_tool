import assert from "node:assert/strict";
import test from "node:test";

import {
  checkInCurrent,
  createRunnerProgress,
  startRunnerProgress,
  tickRunnerDwell,
} from "./runner-progress-v3.mjs";

function definition(dwellSeconds = 2) {
  return {
    meta: { route: { checkpointDwellSeconds: dwellSeconds } },
    route: {
      checkpoints: [
        { id: "a", sequence: 0, lng: 1, lat: 2, z: 3 },
        { id: "b", sequence: 1, lng: 4, lat: 5, z: 6 },
      ],
    },
  };
}

test("checkpoint sequence and dwell countdown come from the definition", () => {
  const progress = startRunnerProgress(createRunnerProgress(definition(2)));
  assert.equal(progress.checkpoints[0].state, "current");
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
  tickRunnerDwell(progress);
  assert.equal(tickRunnerDwell(progress).completed, true);
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
    true,
  );
  assert.equal(tickRunnerDwell(progress).changed, false);
});
