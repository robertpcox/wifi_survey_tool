// FEATURE:      Dashboard-to-Report Player browser acceptance
// SURFACE:      node --test tools/report_player_browser_smoke.test.mjs
// WHY TOGETHER: Missing-browser behavior protects the Step 5 browser gate contract.
// STATE:        None
// RULES:        Chrome absence is explicit skip metadata, never a silent pass.
// PROVENANCE:   Scope/test_plan.md Step 5 browser gates

import assert from "node:assert/strict";
import test from "node:test";

import { runReportPlayerBrowserSmoke } from "./report_player_browser_smoke.mjs";

test("Report Player browser smoke reports missing Chrome as skipped", async () => {
  const result = await runReportPlayerBrowserSmoke({
    chrome: "/path/that/does/not/exist",
  });
  assert.equal(result.skipped, true);
  assert.match(result.reason, /Chrome unavailable/);
});
