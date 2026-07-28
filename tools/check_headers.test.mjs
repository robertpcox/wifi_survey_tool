import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { headerFindings } from "./check_headers.mjs";

const script = fileURLToPath(new URL("./check_headers.mjs", import.meta.url));

test("header gate fails a planted metadata block", async t => {
  assert.deepEqual(headerFindings("export const ok = true;"), []);
  const root = await mkdtemp(join(tmpdir(), "wifi-header-gate-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(
    join(root, "src/planted.mjs"),
    "// FEATURE: planted violation\nexport const value = true;\n",
  );
  const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /authored metadata header block is forbidden/);
});
