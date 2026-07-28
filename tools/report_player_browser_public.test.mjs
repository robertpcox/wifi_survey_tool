// FEATURE:      Report Player browser acceptance
// SURFACE:      node --test tools/report_player_browser_public.test.mjs
// WHY TOGETHER: The build imports one stable public-path Chrome exercise API from this owner.
// STATE:        None
// RULES:        Full behavior runs in the staged browser smoke, not a simulated DOM.
// PROVENANCE:   Scope/test_plan.md Step 5a browser gates

import assert from "node:assert/strict";
import test from "node:test";

import { exercisePublicReportPlayer } from "./report_player_browser_public.mjs";

test("public Report Player Chrome exercise remains callable", () => {
  assert.equal(typeof exercisePublicReportPlayer, "function");
});
