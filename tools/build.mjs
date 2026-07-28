import { rename, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { stageDistribution } from "./build_assets.mjs";

const repositoryRoot = resolve(new URL("../", import.meta.url).pathname);
export const BUILD_COMMANDS = Object.freeze([
  ["tools/check_file_sizes.mjs", "."],
  ["tools/check_headers.mjs", "."],
  ["tools/check_import_boundaries.mjs", "."],
  ["tools/check_nginx_config.mjs"],
  ["tools/check_schemas.mjs"],
  ["tools/generate_manifests.mjs"],
  ["tools/check_secrets.mjs"],
  ["tools/check_step1_completeness.mjs"],
  ["tools/verify_step1_goldens.mjs"],
  ["tools/module_map.mjs"],
  ["tools/check_module_map.mjs"],
  ["--test"],
]);

export async function runBuild({
  root = repositoryRoot,
  commands = BUILD_COMMANDS,
  run = runNode,
  stage = stageDistribution,
} = {}) {
  const dist = resolve(root, "dist");
  const staging = resolve(root, `.build-stage-${process.pid}`);
  await rm(dist, { recursive: true, force: true });
  await rm(staging, { recursive: true, force: true });
  try {
    for (const argumentsList of commands) run(argumentsList, root);
    await stage(root, staging);
    run(["tools/check_secrets.mjs", staging], root);
    run(["tools/shell_browser_smoke.mjs", staging], root);
    await rename(staging, dist);
    return dist;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    await rm(dist, { recursive: true, force: true });
    throw error;
  }
}

function runNode(argumentsList, root) {
  console.log(`\n> node ${argumentsList.join(" ")}`);
  const result = spawnSync(process.execPath, argumentsList, {
    cwd: root,
    encoding: "utf8",
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.status !== 0) {
    throw new Error(`Command failed (${result.status}): node ${argumentsList.join(" ")}`);
  }
}

const isCli = process.argv[1]
  && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  try {
    const dist = await runBuild();
    console.log(`\nBuild complete: ${dist}`);
  } catch (error) {
    console.error(`\nBuild failed; no dist emitted.\n${error.message}`);
    process.exitCode = 1;
  }
}
