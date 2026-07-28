// FEATURE:      Zero-dependency production build
// SURFACE:      BUILD_COMMANDS, runBuild(), runBuildAndDeploy(), parseBuildArguments()
// WHY TOGETHER: Gate ordering, failure cleanup, and post-success demo sync define the build CLI.
// STATE:        Injected temporary build roots and deployment spies
// RULES:        A failed build never invokes deployment; only a completed dist is synchronized.
// PROVENANCE:   User-requested build-to-demo automation

import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import {
  BUILD_COMMANDS,
  parseBuildArguments,
  runBuild,
  runBuildAndDeploy,
} from "./build.mjs";

test("build command declares gates before tests", () => {
  assert.deepEqual(BUILD_COMMANDS.slice(0, 5), [
    ["tools/check_file_sizes.mjs", "."],
    ["tools/check_headers.mjs", "."],
    ["tools/check_import_boundaries.mjs", "."],
    ["tools/check_nginx_config.mjs"],
    ["tools/check_schemas.mjs"],
  ]);
  assert.deepEqual(BUILD_COMMANDS.at(-1), ["--test"]);
});

test("a failed gate removes stale and staged distribution output", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-failed-build-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "dist"), { recursive: true });
  await writeFile(join(root, "dist/stale.txt"), "stale");
  await assert.rejects(
    runBuild({
      root,
      commands: [["planted-gate"]],
      run() {
        throw new Error("planted gate failure");
      },
      stage() {
        throw new Error("stage must not run");
      },
    }),
    /planted gate failure/,
  );
  await assert.rejects(readFile(join(root, "dist/stale.txt")), /ENOENT/);
});

test("completed build synchronizes its dist to the exact demo target", async () => {
  const calls = [];
  const result = await runBuildAndDeploy({
    root: "/source",
    target: "/demo/wifi-survey-v3",
    verify: async target => { calls.push(["verify", target]); },
    build: async options => {
      calls.push(["build", options]);
      return "/source/dist";
    },
    deploy: async options => {
      calls.push(["deploy", options]);
      return { ...options, files: 7 };
    },
  });
  assert.deepEqual(calls, [
    ["verify", "/demo/wifi-survey-v3"],
    ["build", { root: "/source" }],
    ["deploy", { source: "/source/dist", target: "/demo/wifi-survey-v3" }],
  ]);
  assert.equal(result.deployment.files, 7);
});

test("failed build never touches the demo target", async () => {
  let deployed = false;
  await assert.rejects(runBuildAndDeploy({
    verify: async () => {},
    build: async () => { throw new Error("planted build failure"); },
    deploy: async () => { deployed = true; },
  }), /planted build failure/);
  assert.equal(deployed, false);
});

test("demo checkout verification happens before any build work", async () => {
  let built = false;
  await assert.rejects(runBuildAndDeploy({
    verify: async () => { throw new Error("missing demo checkout"); },
    build: async () => { built = true; },
  }), /missing demo checkout/);
  assert.equal(built, false);
});

test("build arguments reject typos instead of accidentally deploying", () => {
  assert.deepEqual(parseBuildArguments([]), { deploy: true });
  assert.deepEqual(parseBuildArguments(["--no-deploy"]), { deploy: false });
  assert.throws(() => parseBuildArguments(["--no-deply"]), /Unknown build option/);
});
