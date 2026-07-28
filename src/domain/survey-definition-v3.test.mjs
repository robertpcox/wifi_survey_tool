import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFINITION_REQUIRED_PATHS,
  validateSurveyDefinitionV3,
} from "./survey-definition-v3.mjs";

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

test("valid definition passes and invalid fixture rejects schema version", async () => {
  assert.deepEqual(validateSurveyDefinitionV3(
    await readFixture("definition.valid.json"),
  ), { valid: true, errors: [] });
  const result = validateSurveyDefinitionV3(
    await readFixture("definition.invalid-schema-version.json"),
  );
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /schemaVersion: must equal 3/);
});

test("every required definition field is rejected by its path", async () => {
  const valid = await readFixture("definition.valid.json");
  for (const path of DEFINITION_REQUIRED_PATHS) {
    const result = validateSurveyDefinitionV3(removePath(valid, path));
    assert.equal(result.valid, false, path);
    assert.ok(result.errors.some(error => error.startsWith(`${path}:`)), path);
  }
});
