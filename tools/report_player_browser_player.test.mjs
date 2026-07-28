// FEATURE:      Report Player browser acceptance
// SURFACE:      node --test tools/report_player_browser_player.test.mjs
// WHY TOGETHER: The public browser path imports stable Player-only exercise APIs from this owner.
// STATE:        None
// RULES:        Full Follow and layout behavior runs in staged Chrome, not a simulated DOM.
// PROVENANCE:   Scope/test_plan.md Step 5a browser gates

import assert from "node:assert/strict";
import test from "node:test";

import {
  exercisePlayerFollow,
  inspectPlayerLayout,
} from "./report_player_browser_player.mjs";

test("Player-only Chrome exercises remain callable", () => {
  assert.equal(typeof exercisePlayerFollow, "function");
  assert.equal(typeof inspectPlayerLayout, "function");
});
