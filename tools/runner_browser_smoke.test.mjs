import assert from "node:assert/strict";
import test from "node:test";

import { runRunnerBrowserSmoke } from "./runner_browser_smoke.mjs";

test("Runner browser smoke reports a missing Chrome as skipped", async () => {
  const result = await runRunnerBrowserSmoke({
    chrome: "/path/that/does/not/exist",
  });
  assert.equal(result.skipped, true);
  assert.match(result.reason, /Chrome unavailable/);
});
