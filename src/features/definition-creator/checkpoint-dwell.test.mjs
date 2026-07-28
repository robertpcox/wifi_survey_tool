// FEATURE:      Creator per-checkpoint dwell
// SURFACE:      Creator dwell policy tests
// WHY TOGETHER: Defaults, preservation, and edits exercise the same checkpoint identity rules.
// STATE:        Representative previous route
// RULES:        Tests cover zero boundaries, mid-leg, leg-end, override, and move-on values.
// PROVENANCE:   Scope/steps/03_build_creator.md

import assert from "node:assert/strict";
import test from "node:test";

import {
  applyCreatorCheckpointDwells,
  replaceCreatorCheckpointDwell,
} from "./checkpoint-dwell.mjs";

const legs = [
  { id: "leg-1", fromStopId: "a", toStopId: "b" },
  { id: "leg-2", fromStopId: "b", toStopId: "c" },
];
const checkpoints = [
  checkpoint(0, "stop", "a", null, 0),
  checkpoint(1, "intermediate", null, "leg-1", 1),
  checkpoint(2, "stop", "b", null, 2),
  checkpoint(3, "stop", "c", null, 3),
];
const plan = { midLegDwellSeconds: 5, legEndDwellSeconds: 30 };

test("Creator applies defaults with zero dwell at start and terminal", () => {
  const values = applyCreatorCheckpointDwells(checkpoints, legs, plan);
  assert.deepEqual(values.map(value => value.dwellSeconds), [0, 5, 30, 0]);
});

test("Creator preserves authored dwell by stop or unchanged leg position", () => {
  const previous = {
    legs,
    checkpoints: applyCreatorCheckpointDwells(checkpoints, legs, plan).map(
      value => value.sequence === 1 ? { ...value, dwellSeconds: 12 } : value,
    ),
  };
  assert.equal(
    applyCreatorCheckpointDwells(checkpoints, legs, plan, previous)[1]
      .dwellSeconds,
    12,
  );
});

test("Creator edits a single checkpoint and uses zero for move on", () => {
  const values = applyCreatorCheckpointDwells(checkpoints, legs, plan);
  assert.equal(replaceCreatorCheckpointDwell(values, 1, 0)[1].dwellSeconds, 0);
  assert.throws(
    () => replaceCreatorCheckpointDwell(values, 0, 5),
    /route start/,
  );
  assert.throws(
    () => replaceCreatorCheckpointDwell(values, 3, 5),
    /manual finish/,
  );
});

function checkpoint(sequence, type, stopId, legId, lng) {
  return {
    id: `checkpoint-${sequence + 1}`,
    sequence,
    type,
    stopId,
    legId,
    lng,
    lat: 0,
    z: 0,
    spacingBasisM: 10,
  };
}
