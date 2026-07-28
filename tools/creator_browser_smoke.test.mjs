import assert from "node:assert/strict";
import test from "node:test";

import { runCreatorBrowserSmoke } from "./creator_browser_smoke.mjs";

test("Creator browser smoke reports a missing Chrome as skipped", async () => {
  const result = await runCreatorBrowserSmoke({
    chrome: "/path/that/does/not/exist",
  });
  assert.equal(result.skipped, true);
  assert.match(result.reason, /Chrome unavailable/);
});
