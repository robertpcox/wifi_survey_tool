// FEATURE:      Runner survey-definition upload tests
// SURFACE:      readRunnerDefinitionFile acceptance and clear rejection messages
// WHY TOGETHER: File parsing, schema gating, and validation errors form one gate.
// STATE:        Fake uploaded files over the runner definition fixture
// RULES:        Invalid uploads name the file and the failure plainly.
// PROVENANCE:   Run-from-file survey definition request

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readRunnerDefinitionFile } from "./definition-upload.mjs";

const fixture = await readFile(new URL(
  "../../../data/fixtures/runner/definition.fixture.v3.json",
  import.meta.url,
), "utf8");

const file = (name, content) => ({ name, text: async () => content });

test("a valid exported definition uploads with its identity untouched", async () => {
  const expected = JSON.parse(fixture);
  const definition = await readRunnerDefinitionFile(
    file(`${expected.meta.surveyId}.definition.v3.json`, fixture),
  );
  assert.equal(definition.meta.surveyId, expected.meta.surveyId);
  assert.equal(definition.route.hash, expected.route.hash);
  assert.deepEqual(definition, expected);
});

test("missing, malformed, wrong-version, and invalid files are named clearly", async () => {
  await assert.rejects(() => readRunnerDefinitionFile(null), /Choose a survey definition file/);
  await assert.rejects(
    () => readRunnerDefinitionFile(file("notes.json", "{oops")),
    /Could not read "notes\.json" as JSON/,
  );
  await assert.rejects(
    () => readRunnerDefinitionFile(file("v2.json", '{"schemaVersion":2}')),
    /"v2\.json" is not a v3 survey definition \(schemaVersion 2\)/,
  );
  await assert.rejects(
    () => readRunnerDefinitionFile(file("result.json", '{"foo":1}')),
    /is not a v3 survey definition \(schemaVersion missing\)/,
  );
  const broken = JSON.parse(fixture);
  delete broken.route.checkpoints;
  await assert.rejects(
    () => readRunnerDefinitionFile(
      file("broken.definition.v3.json", JSON.stringify(broken)),
    ),
    /"broken\.definition\.v3\.json" is not a valid survey definition: .*checkpoints/,
  );
});
