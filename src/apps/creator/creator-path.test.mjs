import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("Creator completes its desktop authoring path in Chrome", context => {
  const result = spawnSync(
    process.execPath,
    ["tools/creator_browser_smoke.mjs", "."],
    { encoding: "utf8" },
  );
  if (result.stdout.startsWith("SKIP ")) {
    context.skip(result.stdout.trim());
    return;
  }
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Creator browser smoke passed/);
});
