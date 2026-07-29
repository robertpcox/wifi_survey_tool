// FEATURE:      Runner browser response fixtures
// SURFACE:      Unit tests for respondRunnerBrowserRequest
// WHY TOGETHER: The smoke manifest must expose its fixture despite live survey rotation.
// STATE:        Recorded request response
// RULES:        Fixture identity and path come only from the injected definition.
// PROVENANCE:   Runner fixture decoupling after production survey replacement

import assert from "node:assert/strict";
import test from "node:test";

import { respondRunnerBrowserRequest } from "./runner_browser_responses.mjs";

test("Runner smoke manifest selects its stable injected definition", async () => {
  const calls = [];
  const request = {
    url: () => "https://runner.example/data/manifests/survey-manifest.v3.json",
    respond: value => calls.push(value),
  };
  await respondRunnerBrowserRequest(request, "https://runner.example", {
    meta: { surveyId: "fixture-survey" },
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(JSON.parse(calls[0].body), {
    schemaVersion: 3,
    surveys: [{
      surveyId: "fixture-survey",
      path: "data/surveys/runner-browser.definition.v3.json",
    }],
  });
});
