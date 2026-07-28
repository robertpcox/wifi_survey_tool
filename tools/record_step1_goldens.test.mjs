import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repository = fileURLToPath(new URL("../", import.meta.url));
const inputs = [
  "tools/record_step1_goldens.mjs",
  "tools/step1_baseline.mjs",
  "data/reference/route-survey-index.html",
  "data/routes/route-L00-Survey.json",
  "data/reference/report_player/route-survey-2026-07-27T08-10-20-847Z.json",
];
const outputs = [
  "data/characterization/step1/monofile-inventory.json",
  "data/characterization/step1/fixtures/session-replay.json",
  "data/characterization/step1/golden/checkpoints.json",
  "data/characterization/step1/golden/route-export.json",
  "data/characterization/step1/golden/session-export.json",
];

async function copyInto(root, relativePath) {
  const destination = join(root, relativePath);
  await mkdir(dirname(destination), { recursive: true });
  await copyFile(join(repository, relativePath), destination);
}

function run(root) {
  return spawnSync(
    process.execPath,
    [join(root, "tools/record_step1_goldens.mjs")],
    { encoding: "utf8" },
  );
}

async function outputHashes(root) {
  return Object.fromEntries(await Promise.all(outputs.map(async path => {
    const content = await readFile(join(root, path));
    return [path, createHash("sha256").update(content).digest("hex")];
  })));
}

test("golden recorder is repeatable and reproduces recorded bytes", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-golden-record-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await Promise.all(inputs.map(path => copyInto(root, path)));

  const firstRun = run(root);
  assert.equal(firstRun.status, 0, firstRun.stderr);
  assert.match(
    firstRun.stdout,
    /Recorded Step 1 goldens from data\/reference\/route-survey-index\.html/,
  );
  const firstHashes = await outputHashes(root);
  for (const path of outputs) {
    assert.equal(
      await readFile(join(root, path), "utf8"),
      await readFile(join(repository, path), "utf8"),
      `${path} differs from the recorded output`,
    );
  }

  const secondRun = run(root);
  assert.equal(secondRun.status, 0, secondRun.stderr);
  assert.deepEqual(await outputHashes(root), firstHashes);
});
