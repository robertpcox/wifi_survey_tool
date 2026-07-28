// FEATURE:      Rollback-safe static demo deployment
// SURFACE:      copyDeployment(options)
// WHY TOGETHER: Exact replacement, metadata exclusion, and pre-copy failure safety share one boundary.
// STATE:        Temporary dist and served directories
// RULES:        A complete copy replaces stale files; an invalid source leaves the target unchanged.
// PROVENANCE:   User-requested build-to-demo automation

import assert from "node:assert/strict";
import * as filesystem from "node:fs/promises";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
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

test("deployment leaves the existing target untouched when source validation fails", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-deploy-invalid-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const target = join(root, "served", "wifi-survey-v3");
  await mkdir(target, { recursive: true });
  await writeFile(join(target, "current.html"), "current");
  await assert.rejects(copyDeployment({
    source: join(root, "missing-dist"),
    target,
  }), /ENOENT/);
  assert.equal(await readFile(join(target, "current.html"), "utf8"), "current");
});

test("deployment restores the old target when the staged switch fails", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-deploy-switch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "dist");
  const parent = join(root, "served");
  const target = join(parent, "wifi-survey-v3");
  await mkdir(source, { recursive: true });
  await mkdir(target, { recursive: true });
  await writeFile(join(source, "index.html"), "new");
  await writeFile(join(target, "index.html"), "current");
  const operations = {
    ...filesystem,
    rename: async (from, to) => {
      if (to === target && basename(from).includes(".deploy-")) {
        throw new Error("planted atomic switch failure");
      }
      return filesystem.rename(from, to);
    },
  };
  await assert.rejects(copyDeployment({ source, target, operations }), /planted/);
  assert.equal(await readFile(join(target, "index.html"), "utf8"), "current");
  assert.deepEqual(
    (await filesystem.readdir(parent)).filter(name => name.startsWith(".")),
    [],
  );
});

test("temporary cleanup failure cannot prevent target restoration", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-deploy-cleanup-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "dist");
  const target = join(root, "served", "wifi-survey-v3");
  await mkdir(source, { recursive: true });
  await mkdir(target, { recursive: true });
  await writeFile(join(source, "index.html"), "new");
  await writeFile(join(target, "index.html"), "current");
  let switchFailed = false;
  const operations = {
    ...filesystem,
    rename: async (from, to) => {
      if (to === target && basename(from).includes(".deploy-")) {
        switchFailed = true;
        throw new Error("planted switch failure");
      }
      return filesystem.rename(from, to);
    },
    rm: async (path, options) => {
      if (switchFailed && basename(path).includes(".deploy-")) {
        throw new Error("planted cleanup failure");
      }
      return filesystem.rm(path, options);
    },
  };
  await assert.rejects(copyDeployment({ source, target, operations }), /switch/);
  assert.equal(await readFile(join(target, "index.html"), "utf8"), "current");
});

test("backup cleanup failure keeps the successfully installed target", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-deploy-backup-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, "dist");
  const target = join(root, "served", "wifi-survey-v3");
  await mkdir(source, { recursive: true });
  await mkdir(target, { recursive: true });
  await writeFile(join(source, "index.html"), "new");
  await writeFile(join(target, "index.html"), "current");
  let installed = false;
  const operations = {
    ...filesystem,
    rename: async (from, to) => {
      await filesystem.rename(from, to);
      if (to === target) installed = true;
    },
    rm: async (path, options) => {
      if (installed && basename(path).includes(".backup-")) {
        throw new Error("planted backup cleanup failure");
      }
      return filesystem.rm(path, options);
    },
  };
  const result = await copyDeployment({ source, target, operations });
  assert.equal(result.files, 1);
  assert.equal(await readFile(join(target, "index.html"), "utf8"), "new");
});
