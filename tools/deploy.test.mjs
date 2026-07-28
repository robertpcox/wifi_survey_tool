import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { copyDeployment } from "./deploy.mjs";

test("deployment replaces its exact target with a copy of dist", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-deploy-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "dist");
  const target = join(root, "served", "wifi-survey-v3");
  await mkdir(source, { recursive: true });
  await mkdir(target, { recursive: true });
  await writeFile(join(source, "index.html"), "new");
  await writeFile(join(source, ".DS_Store"), "finder metadata");
  await writeFile(join(target, "stale.html"), "stale");
  const result = await copyDeployment({ source, target });
  assert.equal(result.files, 1);
  assert.equal(await readFile(join(target, "index.html"), "utf8"), "new");
  await assert.rejects(readFile(join(target, ".DS_Store")), /ENOENT/);
  await assert.rejects(readFile(join(target, "stale.html")), /ENOENT/);
});
