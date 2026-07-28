// FEATURE:      Per-checkpoint survey dwell
// SURFACE:      checkpoint-dwell-v3 contract tests
// WHY TOGETHER: Explicit values, fallback, totals, and topology are one domain contract.
// STATE:        None
// RULES:        Tests cover new definitions and legacy v3 compatibility.
// PROVENANCE:   Scope/contracts/survey_definition_v3.md

import assert from "node:assert/strict";
import test from "node:test";

import {
  authoredCheckpointsV3,
  checkpointDwellDefaults,
  checkpointDwellSeconds,
  totalCheckpointDwellSeconds,
} from "./checkpoint-dwell-v3.mjs";

const generated = [
  checkpoint("a", 0, "stop", "start", null),
  checkpoint("b", 1, "intermediate", null, "leg-1"),
  checkpoint("c", 2, "stop", "finish", null),
];

test("checkpoint dwell is explicit with a legacy fallback", () => {
  assert.equal(checkpointDwellSeconds({ dwellSeconds: 5 }, 9), 5);
  assert.equal(checkpointDwellSeconds({}, 9), 9);
  assert.equal(totalCheckpointDwellSeconds([
    { dwellSeconds: 0 },
    { dwellSeconds: 5 },
    { dwellSeconds: 30 },
  ], 9), 35);
});

test("authored dwell cannot change generated checkpoint topology", () => {
  const supplied = generated.map((value, index) => ({
    ...value,
    dwellSeconds: [0, 5, 30][index],
  }));
  assert.deepEqual(
    authoredCheckpointsV3(generated, supplied).map(value => value.dwellSeconds),
    [0, 5, 30],
  );
  supplied[1].lng = 99;
  assert.throws(
    () => authoredCheckpointsV3(generated, supplied),
    /must match the generated route/,
  );
});

test("Creator defaults can be inferred from explicit or legacy dwell", () => {
  assert.deepEqual(checkpointDwellDefaults([
    { type: "stop", sequence: 0, dwellSeconds: 0 },
    { type: "intermediate", sequence: 1, dwellSeconds: 5 },
    { type: "stop", sequence: 2, dwellSeconds: 30 },
  ], 9), {
    midLegDwellSeconds: 5,
    legEndDwellSeconds: 30,
  });
  assert.deepEqual(checkpointDwellDefaults(generated, 9), {
    midLegDwellSeconds: 9,
    legEndDwellSeconds: 9,
  });
});

function checkpoint(id, sequence, type, stopId, legId) {
  return {
    id,
    sequence,
    type,
    lng: sequence,
    lat: sequence,
    z: 0,
    stopId,
    legId,
    spacingBasisM: 10,
  };
}
