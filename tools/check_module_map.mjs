import {
  cp,
  mkdtemp,
  readFile,
  rm,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function checkModuleMap(root = repositoryRoot) {
  const temporary = await mkdtemp(join(tmpdir(), "wifi-module-map-check-"));
  try {
    await cp(resolve(root, "src"), resolve(temporary, "src"), { recursive: true });
    await cp(
      resolve(root, "tools/module_map.mjs"),
      resolve(temporary, "tools/module_map.mjs"),
    );
    await cp(
      resolve(root, "tools/module_map_format.mjs"),
      resolve(temporary, "tools/module_map_format.mjs"),
    );
    const result = spawnSync(
      process.execPath,
      [resolve(temporary, "tools/module_map.mjs")],
      { encoding: "utf8" },
    );
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
    const [actual, expected] = await Promise.all([
      readFile(resolve(root, "docs/module-map.md"), "utf8"),
      readFile(resolve(temporary, "docs/module-map.md"), "utf8"),
    ]);
    return actual === expected;
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
