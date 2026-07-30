// FEATURE:      Runner capture-mode selection tests
// SURFACE:      Dynamic option and template selection
// WHY TOGETHER: One test boundary proves the dropdown cannot collide with survey IDs.
// STATE:        None
// RULES:        Dynamic uses the first configured site survey as its launch profile.
// PROVENANCE:   Dynamic room survey field workflow

import assert from "node:assert/strict";
import test from "node:test";
import {
  DYNAMIC_SURVEY_ID,
  dynamicTemplateEntry,
  runnerModeForSelection,
} from "./runner-mode.mjs";

test("dynamic selection is explicit while survey IDs remain planned", () => {
  assert.equal(runnerModeForSelection(DYNAMIC_SURVEY_ID), "dynamic-room");
  assert.equal(runnerModeForSelection("survey-1"), "planned-route");
});

test("dynamic mode reuses the first site profile without inventing one", () => {
  const surveys = [{ surveyId: "site-1" }, { surveyId: "site-2" }];
  assert.equal(dynamicTemplateEntry(surveys), surveys[0]);
  assert.throws(() => dynamicTemplateEntry([]), /requires a site survey/);
});
