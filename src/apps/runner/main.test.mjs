import assert from "node:assert/strict";
import test from "node:test";

import { bootRunner } from "./main.mjs";

test("Runner shell composes the v3 feature with one memory store", async () => {
  const status = {};
  const documentRef = {
    querySelector: selector => selector === "[data-shell-status]" ? status : null,
  };
  let mounted;
  const shell = bootRunner(documentRef, {
    mountRunner: options => {
      mounted = options;
      return { ready: Promise.resolve("ready") };
    },
  });
  assert.equal(shell.appName, "Runner");
  assert.equal(status.textContent, "Runner shell ready.");
  assert.ok(shell.credentials);
  assert.equal(mounted.credentials, shell.credentials);
  assert.equal(mounted.documentRef, documentRef);
  assert.equal(await shell.ready, "ready");
});
