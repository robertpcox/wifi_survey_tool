import assert from "node:assert/strict";
import test from "node:test";

import { bootRunner } from "./main.mjs";

test("Runner shell boots independently of Runner feature code", () => {
  const status = {};
  const shell = bootRunner({
    querySelector: selector => selector === "[data-shell-status]" ? status : null,
  });
  assert.equal(shell.appName, "Runner");
  assert.equal(status.textContent, "Runner shell ready.");
  assert.ok(shell.credentials);
});
