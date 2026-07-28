// FEATURE:      Zero-dependency production build
// SURFACE:      runBuild(), runBuildAndDeploy(), parseBuildArguments(), CLI
// WHY TOGETHER: Ordered gates, staging, browser checks, and atomic distribution replacement form one build.
// STATE:        Temporary staging directory for one build invocation
// RULES:        Emit no dist when any gate, test, staging check, or browser path fails.
// PROVENANCE:   Scope/coding_pattern.md build gates

import { rename, rm, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { stageDistribution } from "./build_assets.mjs";
import { copyDeployment } from "./deploy.mjs";

const repositoryRoot = resolve(new URL("../", import.meta.url).pathname);
export const DEMO_DEPLOYMENT_TARGET = resolve(
  repositoryRoot,
  "../demo.mazemap_nginx/html/wifi-survey-v3",
);
export const BUILD_COMMANDS = Object.freeze([
  ["tools/check_file_sizes.mjs", "."],
  ["tools/check_headers.mjs", "."],
  ["tools/check_import_boundaries.mjs", "."],
  ["tools/check_nginx_config.mjs"],
  ["tools/check_schemas.mjs"],
  ["tools/check_reference_report.mjs"],
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
    run(["tools/creator_browser_smoke.mjs", staging], root);
    run(["tools/runner_browser_smoke.mjs", staging], root);
    run(["tools/report_player_browser_smoke.mjs", staging], root);
    await rename(staging, dist);
    return dist;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    await rm(dist, { recursive: true, force: true });
    throw error;
  }
}

export async function runBuildAndDeploy({
  root = repositoryRoot,
  target = DEMO_DEPLOYMENT_TARGET,
  build = runBuild,
  deploy = copyDeployment,
  verify = verifyDemoCheckout,
  buildOptions = {},
} = {}) {
  await verify(target);
  const dist = await build({ root, ...buildOptions });
  const deployment = await deploy({ source: dist, target });
  return Object.freeze({ deployment, dist });
}

export async function verifyDemoCheckout(target, inspect = stat) {
  const resolvedTarget = resolve(target);
  const checkout = resolve(resolvedTarget, "../..");
  const html = resolve(checkout, "html");
  if (resolve(resolvedTarget, "..") !== html) {
    throw new TypeError("Demo target must be directly below the checkout html directory");
  }
  await inspect(resolve(checkout, ".git"));
  const htmlStat = await inspect(html);
  if (!htmlStat.isDirectory()) throw new TypeError("Demo checkout html path is not a directory");
  return checkout;
}

export function parseBuildArguments(argumentsList) {
  const unknown = argumentsList.find(argument => argument !== "--no-deploy");
  if (unknown) throw new TypeError(`Unknown build option: ${unknown}`);
  return Object.freeze({ deploy: !argumentsList.includes("--no-deploy") });
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
    const options = parseBuildArguments(process.argv.slice(2));
    if (!options.deploy) {
      const dist = await runBuild();
      console.log(`\nBuild complete: ${dist}\nDemo sync skipped.`);
    } else {
      const { deployment, dist } = await runBuildAndDeploy();
      console.log(`\nBuild complete: ${dist}`);
      console.log(`Demo synchronized: ${deployment.files} files to ${deployment.target}`);
    }
  } catch (error) {
    console.error(`\nBuild or demo sync failed.\n${error.message}`);
    process.exitCode = 1;
  }
}
