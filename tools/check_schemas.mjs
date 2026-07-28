import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { validateSurveyDefinitionV3 } from "../src/domain/survey-definition-v3.mjs";
import { validateSurveyResultV3 } from "../src/domain/survey-result-v3.mjs";

const fixtureRoot = new URL("../src/domain/fixtures/", import.meta.url);
const fixtures = [
  ["definition.valid.json", validateSurveyDefinitionV3, true],
  ["definition.invalid-schema-version.json", validateSurveyDefinitionV3, false],
  ["result.valid.json", validateSurveyResultV3, true],
  ["result.invalid-schema-version.json", validateSurveyResultV3, false],
];

export async function checkSchemaFixtures() {
  const failures = [];
  for (const [name, validate, expected] of fixtures) {
    const input = JSON.parse(await readFile(new URL(name, fixtureRoot), "utf8"));
    const result = validate(input);
    if (result.valid !== expected) {
      failures.push(`${name}: expected valid=${expected}; ${result.errors.join("; ")}`);
    }
  }
  return failures;
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const failures = await checkSchemaFixtures();
  if (failures.length) {
    console.error(`Schema fixture gate failed:\n- ${failures.join("\n- ")}`);
    process.exitCode = 1;
  } else {
    console.log(`Schema fixture gate passed (${fixtures.length} fixtures).`);
  }
}
