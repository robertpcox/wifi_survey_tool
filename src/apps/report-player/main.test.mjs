import assert from "node:assert/strict";
import test from "node:test";

import { bootReportPlayer } from "./main.mjs";

test("Report Player shell boots independently of report feature code", () => {
  const status = {};
  const shell = bootReportPlayer({
    querySelector: selector => selector === "[data-shell-status]" ? status : null,
  });
  assert.equal(shell.appName, "Report Player");
  assert.equal(status.textContent, "Report Player shell ready.");
  assert.ok(shell.credentials);
});
