import { cp, readdir, rm, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(new URL("../", import.meta.url).pathname);

export async function copyDeployment({
  source = resolve(repositoryRoot, "dist"),
  target,
} = {}) {
  if (!target) throw new TypeError("A deployment target is required");
  const resolvedSource = resolve(source);
  const resolvedTarget = resolve(target);
  if (resolvedSource === resolvedTarget) throw new TypeError("Deployment target must differ from dist");
  const sourceStat = await stat(resolvedSource);
  if (!sourceStat.isDirectory()) throw new TypeError("dist is not a directory");
  await rm(resolvedTarget, { recursive: true, force: true });
  await cp(resolvedSource, resolvedTarget, {
    recursive: true,
    filter: path => basename(path) !== ".DS_Store",
  });
  return {
    source: resolvedSource,
    target: resolvedTarget,
    files: await countFiles(resolvedTarget),
  };
}

async function countFiles(directory) {
  let count = 0;
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    count += entry.isDirectory()
      ? await countFiles(resolve(directory, entry.name))
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
