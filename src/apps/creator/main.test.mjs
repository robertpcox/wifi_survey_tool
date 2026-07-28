import assert from "node:assert/strict";
import test from "node:test";

import { bootCreator } from "./main.mjs";

test("Creator shell boots independently of Creator feature code", () => {
  const status = {};
  const shell = bootCreator({
    querySelector: selector => selector === "[data-shell-status]" ? status : null,
  });
  assert.equal(shell.appName, "Creator");
  assert.equal(status.textContent, "Creator shell ready.");
  assert.ok(shell.credentials);
});
