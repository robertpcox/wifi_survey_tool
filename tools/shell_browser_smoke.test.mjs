import assert from "node:assert/strict";
import test from "node:test";

import {
  contentTypeFor,
  isIgnoredBrowserRequest,
  runShellBrowserSmoke,
  SHELL_PATHS,
} from "./shell_browser_smoke.mjs";

test("shell smoke declares every v3 app and JavaScript MIME", () => {
  assert.deepEqual(SHELL_PATHS, [
    "/dashboard/",
    "/creator/",
    "/runner/",
    "/report-player/",
  ]);
  assert.equal(contentTypeFor("main.mjs"), "application/javascript; charset=utf-8");
});

test("shell smoke ignores the host favicon but no app assets", () => {
  assert.equal(isIgnoredBrowserRequest("https://host.test/favicon.ico"), true);
  assert.equal(isIgnoredBrowserRequest("https://host.test/creator/main.mjs"), false);
});

test("shell smoke reports missing Chrome as skipped rather than passed", async () => {
  const result = await runShellBrowserSmoke({
    root: ".",
    chrome: "/path/that/does/not/exist",
  });
  assert.equal(result.skipped, true);
  assert.match(result.reason, /Chrome unavailable/);
});
