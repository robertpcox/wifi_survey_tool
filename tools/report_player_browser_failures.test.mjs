// FEATURE:      Report Player browser acceptance
// SURFACE:      node --test tools/report_player_browser_failures.test.mjs
// WHY TOGETHER: The build imports one stable launch-failure Chrome exercise API from this owner.
// STATE:        None
// RULES:        Recorded access/network/unknown behavior runs in staged Chrome.
// PROVENANCE:   Scope/test_plan.md Step 5a browser gates

import assert from "node:assert/strict";
import test from "node:test";

import { exerciseMapLaunchFailures } from "./report_player_browser_failures.mjs";

test("map launch-failure Chrome exercise remains callable", () => {
  assert.equal(typeof exerciseMapLaunchFailures, "function");
});
