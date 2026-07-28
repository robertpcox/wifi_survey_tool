import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check_file_sizes.mjs", import.meta.url));

function run(root, ...argumentsList) {
  return spawnSync(process.execPath, [script, root, ...argumentsList], {
    encoding: "utf8",
  });
}

test("strict size gate fails a planted review-sized file", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-size-gate-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "src", "module.mjs");
  await mkdir(dirname(source), { recursive: true });
  await writeFile(source, "export const small = true;\n");

  const clean = run(root);
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /Checked 1 files: 0 failed, 0 need review/);

  await writeFile(source, "line\n".repeat(151));
  const planted = run(root);
  assert.equal(planted.status, 1);
  assert.match(planted.stdout, /REVIEW — exceeds the 150-line context target/);
  assert.match(planted.stdout, /src\/module\.mjs — 151 lines/);
  assert.match(planted.stdout, /Checked 1 files: 0 failed, 1 need review/);

  const allowed = run(root, "--allow-review");
  assert.equal(allowed.status, 0, allowed.stderr);
  assert.match(allowed.stdout, /1 need review/);
});

test("allow-review never permits a planted hard-ceiling breach", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-size-ceiling-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "oversized.mjs");
  await writeFile(source, "line\n".repeat(401));

  const result = run(root, "--allow-review");
  assert.equal(result.status, 1);
  assert.match(result.stdout, /FAIL — exceeds a hard ceiling/);
  assert.match(result.stdout, /oversized\.mjs — 401 lines/);
  assert.match(result.stdout, /Checked 1 files: 1 failed, 0 need review/);
});
