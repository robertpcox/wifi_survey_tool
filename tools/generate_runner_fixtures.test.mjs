import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateSurveyResultV3 } from "../src/domain/survey-result-v3.mjs";
import { buildRunnerFixtures } from "./generate_runner_fixtures.mjs";

const definition = JSON.parse(await readFile(
  new URL("../data/surveys/survey-dunedin-level-00-dev-v3.definition.v3.json", import.meta.url),
));

test("Runner fixtures are deterministic validated completion paths", () => {
  const first = buildRunnerFixtures(definition);
  const second = buildRunnerFixtures(definition);
  assert.deepEqual(first, second);
  assert.deepEqual(
    first.map(result => result.run.completionStatus),
    ["completed", "aborted"],
  );
  assert.equal(first[0].checkIns.length, definition.route.checkpoints.length);
  assert.equal(first[1].checkIns.length, 0);
  assert.equal(first[0].run.device.type, "mobile");
  assert.equal(first[1].run.device.type, "asset");
  assert.equal(first[0].run.preflight.acknowledged, false);
  assert.equal(first[1].run.preflight.acknowledged, true);
  assert.ok(first.every(result => validateSurveyResultV3(result).valid));
});
