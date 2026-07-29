import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  RESULT_REQUIRED_PATHS,
  validateSurveyResultV3,
} from "./survey-result-v3.mjs";

const readFixture = async name => JSON.parse(await readFile(
  new URL(`./fixtures/${name}`, import.meta.url),
));

function removePath(input, path) {
  const copy = structuredClone(input);
  const keys = path.split(".");
  const owner = keys.slice(0, -1).reduce((value, key) => value[key], copy);
  delete owner[keys.at(-1)];
  return copy;
}

test("valid result passes and invalid fixture rejects schema version", async () => {
  assert.deepEqual(validateSurveyResultV3(
    await readFixture("result.valid.json"),
  ), { valid: true, errors: [] });
  const result = validateSurveyResultV3(
    await readFixture("result.invalid-schema-version.json"),
  );
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /schemaVersion: must equal 3/);
});

test("every required result field is rejected by its path", async () => {
  const valid = await readFixture("result.valid.json");
  for (const path of RESULT_REQUIRED_PATHS) {
    const result = validateSurveyResultV3(removePath(valid, path));
    assert.equal(result.valid, false, path);
    assert.ok(result.errors.some(error => error.startsWith(`${path}:`)), path);
  }
});

test("result identity and serialized credentials cannot drift", async () => {
  const invalid = await readFixture("result.valid.json");
  invalid.run.routeHash = "different";
  invalid.run.runtime = { mapAccess: "planted-value" };
  const errors = validateSurveyResultV3(invalid).errors.join("\n");
  assert.match(errors, /run\.routeHash: must match meta/);
  assert.match(errors, /run\.runtime\.mapAccess: serialized credential values are forbidden/);
});

test("embedded route identity must match the copied meta route identity", async () => {
  const replacements = {
    routeId: "different-route",
    version: 99,
    hash: "f".repeat(64),
  };
  for (const [field, replacement] of Object.entries(replacements)) {
    const invalid = await readFixture("result.valid.json");
    invalid.route[field] = replacement;
    assert.match(
      validateSurveyResultV3(invalid).errors.join("\n"),
      new RegExp(`route\\.${field}: must match meta\\.route`),
      field,
    );
  }
});

test("aborted runs may stop before check-in but completed runs preserve order", async () => {
  const aborted = await readFixture("result.valid.json");
  aborted.run.completionStatus = "aborted";
  aborted.checkIns = [];
  assert.equal(validateSurveyResultV3(aborted).valid, true);

  const incomplete = await readFixture("result.valid.json");
  incomplete.checkIns.pop();
  assert.match(
    validateSurveyResultV3(incomplete).errors.join("\n"),
    /completed run must include every route checkpoint/,
  );
  incomplete.checkIns = incomplete.route.checkpoints.map((checkpoint, index) => ({
    checkpointId: checkpoint.id,
    at: `2026-07-28T01:00:0${index + 1}.000Z`,
    groundTruth: {
      lng: checkpoint.lng,
      lat: checkpoint.lat,
      z: checkpoint.z,
    },
  }));
  assert.equal(validateSurveyResultV3(incomplete).valid, true);
  incomplete.checkIns.reverse();
  assert.match(
    validateSurveyResultV3(incomplete).errors.join("\n"),
    /must follow route checkpoint order/,
  );
});

test("timeout polls use zero status and preflight must reference a poll", async () => {
  const result = await readFixture("result.valid.json");
  result.run.completionStatus = "aborted";
  result.checkIns = [];
  result.polls[0].httpStatus = 0;
  assert.equal(validateSurveyResultV3(result).valid, true);
  result.run.preflight.sampleId = "missing";
  assert.match(
    validateSurveyResultV3(result).errors.join("\n"),
    /must reference an exported poll/,
  );
});

test("capture notes require an embedded-route anchor matching their event", async () => {
  const result = await readFixture("result.valid.json");
  const routeAnchor = {
    type: "checkpoint-interval",
    routeHash: result.route.hash,
    fromCheckpointId: "checkpoint-a",
    toCheckpointId: "checkpoint-b",
    legId: "leg-a-b",
  };
  result.notes = [{
    id: "note-1",
    routeAnchor,
    note: "Offline",
    trigger: "source-failure",
    sourceError: null,
    openedAt: "2026-07-28T01:00:01.000Z",
    resumedAt: "2026-07-28T01:00:03.000Z",
    dwellSeconds: 2,
    groundTruth: { lng: 170.5, lat: -45.87, z: 1 },
  }];
  result.events.push({
    type: "capture-note",
    noteId: "note-1",
    routeAnchor,
    at: result.notes[0].openedAt,
    resumedAt: result.notes[0].resumedAt,
    dwellSeconds: 2,
  });
  assert.equal(validateSurveyResultV3(result).valid, true);
  result.events.at(-1).routeAnchor = {
    ...routeAnchor,
    toCheckpointId: "checkpoint-a",
  };
  assert.match(validateSurveyResultV3(result).errors.join("\n"),
    /routeAnchor: must match capture-note event/);
});
