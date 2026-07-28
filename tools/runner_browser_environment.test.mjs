import assert from "node:assert/strict";
import test from "node:test";

import { installRunnerBrowserEnvironment } from "./runner_browser_environment.mjs";

test("Runner browser environment installs interception on a page", async () => {
  const calls = [];
  const page = {
    async evaluateOnNewDocument(value) {
      calls.push(["install", typeof value]);
    },
    async setRequestInterception(value) {
      calls.push(["intercept", value]);
    },
    on(name, handler) {
      calls.push(["on", name, typeof handler]);
    },
  };
  await installRunnerBrowserEnvironment(page, "https://runner.example", {});
  assert.deepEqual(calls, [
    ["install", "function"],
    ["intercept", true],
    ["on", "request", "function"],
  ]);
});
