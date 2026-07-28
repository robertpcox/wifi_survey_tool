// FEATURE:      Report Player browser acceptance
// SURFACE:      node --test tools/report_player_browser_stub.test.mjs
// WHY TOGETHER: Stub installation API and scenario forwarding protect deterministic Chrome setup.
// STATE:        Minimal fake Puppeteer page
// RULES:        Unit setup performs no browser or network request.
// PROVENANCE:   Scope/test_plan.md Step 5a browser gates

import assert from "node:assert/strict";
import test from "node:test";

import { installReportPlayerMazeMapStub } from "./report_player_browser_stub.mjs";

test("Report Player stub forwards the requested recorded scenario", async () => {
  const calls = [];
  const page = {
    evaluateOnNewDocument: async (_installer, scenario) => calls.push(scenario),
    on: () => {},
    setRequestInterception: async value => calls.push(value),
  };
  await installReportPlayerMazeMapStub(page, "http://127.0.0.1", "network-failure");
  assert.deepEqual(calls, ["network-failure", true]);
});
