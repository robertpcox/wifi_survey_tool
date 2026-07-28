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
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const implementation = fileURLToPath(
  new URL("./check_step1_completeness.mjs", import.meta.url),
);

async function write(root, path, content) {
  const destination = join(root, path);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, content);
}

test("completeness CLI maps direct and aliased behavior in isolation", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-completeness-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tool = join(root, "tools/check_step1_completeness.mjs");
  await mkdir(dirname(tool), { recursive: true });
  await copyFile(implementation, tool);

  const reference = "<html>preserved monofile</html>\n";
  await write(root, "data/reference/route-survey-index.html", reference);
  await write(root, "src/apps/route-survey/index.html", "<input id=\"routeName\">\n");
  await write(
    root,
    "src/domain/direct.mjs",
    "export function directFunction() {}\nexport function doThing() {}\n",
  );
  await write(
    root,
    "src/adapters/positioning/sources.mjs",
    "export function fetchPositionSource() {}\n",
  );
  const inventory = {
    source: "data/reference/route-survey-index.html",
    sha256: createHash("sha256").update(reference).digest("hex"),
    functions: ["directFunction", "fetchSource"],
    inlineActions: ["doThing"],
    elementIds: ["routeName"],
  };
  await write(
    root,
    "data/characterization/step1/monofile-inventory.json",
    `${JSON.stringify(inventory, null, 2)}\n`,
  );

  const result = spawnSync(process.execPath, [tool], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.match(
    result.stdout,
    /Step 1 completeness passed: 2 functions, 1 element IDs, 1 actions mapped/,
  );
  const report = JSON.parse(await readFile(
    join(root, "data/characterization/step1/split-inventory.json"),
    "utf8",
  ));
  assert.equal(report.sourceSha256, inventory.sha256);
  assert.equal(report.legacyFunctionCount, 2);
  assert.equal(report.retainedElementCount, 1);
  assert.equal(report.legacyActionCount, 1);
  assert.deepEqual(report.mappedFunctions.directFunction, {
    path: "src/domain/direct.mjs",
    symbol: "directFunction",
  });
  assert.deepEqual(report.mappedFunctions.fetchSource, {
    path: "src/adapters/positioning/sources.mjs",
    symbol: "fetchPositionSource",
  });
});
