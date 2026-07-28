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
