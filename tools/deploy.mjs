// FEATURE:      Rollback-safe static demo deployment
// SURFACE:      copyDeployment(options), CLI
// WHY TOGETHER: Staging, replacement, rollback, and file receipts form one safe copy.
// STATE:        One temporary sibling and optional backup beside the exact target
// RULES:        Prepare first; restore the old target after any failed switch.
// PROVENANCE:   User-requested build-to-demo automation

import * as filesystem from "node:fs/promises";
import {
  basename,
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(new URL("../", import.meta.url).pathname);

export async function copyDeployment({
  source = resolve(repositoryRoot, "dist"),
  target,
  operations = filesystem,
} = {}) {
  if (!target) throw new TypeError("A deployment target is required");
  const resolvedSource = resolve(source);
  const resolvedTarget = resolve(target);
  if (resolvedSource === resolvedTarget) throw new TypeError("Deployment target must differ from dist");
  if (contains(resolvedSource, resolvedTarget) || contains(resolvedTarget, resolvedSource)) {
    throw new TypeError("Deployment source and target cannot contain each other");
  }
  if (dirname(resolvedTarget) === resolvedTarget) {
    throw new TypeError("Deployment target cannot be a filesystem root");
  }
  const sourceStat = await operations.stat(resolvedSource);
  if (!sourceStat.isDirectory()) throw new TypeError("dist is not a directory");
  const parent = dirname(resolvedTarget);
  const parentStat = await operations.stat(parent);
  if (!parentStat.isDirectory()) throw new TypeError("Deployment parent is not a directory");
  const temporary = resolve(parent, `.${basename(resolvedTarget)}.deploy-${process.pid}`);
  const backup = resolve(parent, `.${basename(resolvedTarget)}.backup-${process.pid}`);
  await operations.rm(temporary, { recursive: true, force: true });
  await operations.rm(backup, { recursive: true, force: true });
  let targetMoved = false;
  let switched = false;
  let files;
  try {
    await operations.cp(resolvedSource, temporary, {
      recursive: true,
      filter: path => basename(path) !== ".DS_Store",
    });
    files = await countFiles(temporary, operations);
    try {
      await operations.rename(resolvedTarget, backup);
      targetMoved = true;
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    await operations.rename(temporary, resolvedTarget);
    switched = true;
    if (targetMoved) {
      await safeRemove(backup, operations);
      targetMoved = false;
    }
  } catch (error) {
    let restoreError;
    if (targetMoved && !switched) {
      try {
        await operations.rename(backup, resolvedTarget);
      } catch (cause) {
        restoreError = cause;
      }
    }
    await safeRemove(temporary, operations);
    if (restoreError) {
      throw new AggregateError(
        [error, restoreError],
        "Deployment failed and the old target could not be restored",
      );
    }
    throw error;
  }
  return {
    source: resolvedSource,
    target: resolvedTarget,
    files,
  };
}

async function safeRemove(path, operations) {
  try {
    await operations.rm(path, { recursive: true, force: true });
  } catch {}
}

function contains(parent, child) {
  const path = relative(parent, child);
  return path !== ""
    && path !== ".."
    && !path.startsWith(`..${sep}`)
    && !isAbsolute(path);
}

async function countFiles(directory, operations = filesystem) {
  let count = 0;
  for (const entry of await operations.readdir(directory, { withFileTypes: true })) {
    count += entry.isDirectory()
      ? await countFiles(resolve(directory, entry.name), operations)
      : 1;
  }
  return count;
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const result = await copyDeployment({ target: process.argv[2] });
  console.log(`Copied ${result.files} files from dist to ${result.target}.`);
}
