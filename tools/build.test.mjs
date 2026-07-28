import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { BUILD_COMMANDS, runBuild } from "./build.mjs";

test("build command declares gates before tests", () => {
  assert.deepEqual(BUILD_COMMANDS.slice(0, 5), [
    ["tools/check_file_sizes.mjs", "."],
    ["tools/check_headers.mjs", "."],
    ["tools/check_import_boundaries.mjs", "."],
    ["tools/check_nginx_config.mjs"],
    ["tools/check_schemas.mjs"],
  ]);
  assert.deepEqual(BUILD_COMMANDS.at(-1), ["--test"]);
});

test("a failed gate removes stale and staged distribution output", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-failed-build-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "dist"), { recursive: true });
  await writeFile(join(root, "dist/stale.txt"), "stale");
  await assert.rejects(
    runBuild({
      root,
      commands: [["planted-gate"]],
      run() {
        throw new Error("planted gate failure");
      },
      stage() {
        throw new Error("stage must not run");
      },
    }),
    /planted gate failure/,
  );
  await assert.rejects(readFile(join(root, "dist/stale.txt")), /ENOENT/);
});
