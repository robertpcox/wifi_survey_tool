import assert from "node:assert/strict";
import test from "node:test";

import { bootDashboard } from "./main.mjs";

test("Dashboard shell boots without report feature code", () => {
  const status = {};
  const shell = bootDashboard({
    querySelector: selector => selector === "[data-shell-status]" ? status : null,
  });
  assert.equal(shell.appName, "Dashboard");
  assert.equal(status.textContent, "Dashboard shell ready.");
  assert.equal(shell.credentials, null);
});
