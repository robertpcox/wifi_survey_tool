// FEATURE:      Report Player actual-SDK acceptance
// SURFACE:      node --test tools/report_player_actual_sdk_smoke.test.mjs
// WHY TOGETHER: Explicit missing-browser behavior protects the manual actual-SDK acceptance command.
// STATE:        None
// RULES:        Missing Chrome is reported as skipped metadata, never mistaken for live acceptance.
// PROVENANCE:   Scope/steps/05a_recast_player.md served actual-SDK acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { runReportPlayerActualSdkSmoke } from "./report_player_actual_sdk_smoke.mjs";

test("actual-SDK Report Player smoke reports unavailable Chrome", async () => {
  const result = await runReportPlayerActualSdkSmoke({
    chrome: "/path/that/does/not/exist",
  });
  assert.equal(result.skipped, true);
  assert.match(result.reason, /Chrome unavailable/);
});
