// FEATURE:      Generated module-map freshness
// SURFACE:      checkModuleMap(root), CLI
// WHY TOGETHER: Isolated regeneration and full shard comparison form one freshness gate
// STATE:        Temporary repository copy for each check
// RULES:        Missing, changed, or extra generated map documents fail the gate
// PROVENANCE:   Scope/coding_pattern.md generated module-map requirement

import {
  cp,
  mkdtemp,
  readdir,
  readFile,
  rm,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { isModuleMapDocumentName } from "./module_map_documents.mjs";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const toolFiles = [
  "module_map.mjs",
  "module_map_documents.mjs",
  "module_map_format.mjs",
];

async function moduleMapSnapshot(directory) {
  let names;
  try {
    names = (await readdir(directory)).filter(isModuleMapDocumentName).sort();
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return Promise.all(names.map(async name => ({
    name,
    content: await readFile(resolve(directory, name), "utf8"),
  })));
}

export async function checkModuleMap(root = repositoryRoot) {
  const temporary = await mkdtemp(join(tmpdir(), "wifi-module-map-check-"));
  try {
    await cp(resolve(root, "src"), resolve(temporary, "src"), { recursive: true });
    for (const name of toolFiles) {
      await cp(resolve(root, "tools", name), resolve(temporary, "tools", name));
    }
    const result = spawnSync(
      process.execPath,
      [resolve(temporary, "tools/module_map.mjs")],
      { encoding: "utf8" },
    );
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
    const [actual, expected] = await Promise.all([
      moduleMapSnapshot(resolve(root, "docs")),
      moduleMapSnapshot(resolve(temporary, "docs")),
    ]);
    return JSON.stringify(actual) === JSON.stringify(expected);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  const root = resolve(process.argv[2] || repositoryRoot);
  if (await checkModuleMap(root)) {
    console.log("Module map freshness gate passed.");
  } else {
    console.error("Module map freshness gate failed: run node tools/module_map.mjs");
    process.exitCode = 1;
  }
}
