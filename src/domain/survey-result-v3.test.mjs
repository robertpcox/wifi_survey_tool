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
