// FEATURE:      Report Player browser data fixtures
// SURFACE:      Unit tests for customerManifest
// WHY TOGETHER: Stable manifest projection protects browser acceptance from survey rotation.
// STATE:        Shared Report Player result fixture
// RULES:        One completed fixture result remains launchable from its matching survey.
// PROVENANCE:   Report Player fixture decoupling after production survey replacement

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { customerManifest } from "./report_player_browser_data.mjs";

const fixture = JSON.parse(await readFile(new URL(
  "../data/fixtures/report-player/result.fixture.v3.json",
  import.meta.url,
)));

test("Report Player smoke manifest links its stable fixture result", () => {
  const manifest = customerManifest(fixture);
  assert.equal(manifest.customerId, fixture.run.customerId);
  assert.equal(manifest.surveys[0].surveyId, fixture.meta.surveyId);
  assert.equal(manifest.results[0].resultId, fixture.run.resultId);
  assert.equal(manifest.results[0].completionStatus, "completed");
  assert.match(manifest.results[0].path, /^results\/.+\.result\.v3\.json$/);
});
