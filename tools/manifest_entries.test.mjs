// FEATURE:      Deterministic discovery manifest entries
// SURFACE:      Node test for manifest_entries.mjs
// WHY TOGETHER: Privacy projection and customer grouping prove the generated manifest shape.
// STATE:        Parsed valid survey and result fixtures
// RULES:        Discovery keeps comparison labels while excluding Client IP.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  customerManifests,
  resultManifestEntry,
  surveyManifestEntry,
} from "./manifest_entries.mjs";

const fixtures = new URL("../src/domain/fixtures/", import.meta.url);
const definition = JSON.parse(await readFile(new URL("definition.valid.json", fixtures)));
const result = JSON.parse(await readFile(new URL("result.valid.json", fixtures)));

test("entry projections retain discovery identity without Client IP", () => {
  const survey = surveyManifestEntry(definition, "data/surveys/demo.json");
  const run = resultManifestEntry(result, "results/demo.json");
  assert.deepEqual(run.device, {
    type: "mobile",
    os: "ExampleOS 1",
    name: "Demo handset",
  });
  assert.equal(JSON.stringify(run).includes("clientIp"), false);
  const customers = customerManifests([survey], [run]);
  assert.equal(customers[0].customerId, result.run.customerId);
  assert.equal(customers[0].surveys[0], survey);
  assert.equal(customers[0].results[0], run);
});
