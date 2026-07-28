// FEATURE:      Authored module metadata
// SURFACE:      node --test tools/check_headers.test.mjs
// WHY TOGETHER: Unit and CLI failure-path coverage verify the header gate contract
// STATE:        Temporary fixture directory per CLI test
// RULES:        Baselines waive only unresolved legacy files and reject new or stale exceptions
// PROVENANCE:   Step 5 planted module-header violation

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { headerFindings } from "./check_headers.mjs";

const script = fileURLToPath(new URL("./check_headers.mjs", import.meta.url));
const completeHeader = [
  "// FEATURE: Authored module metadata",
  "// SURFACE: Fixture module",
  "// WHY TOGETHER: The fixture represents one cohesive module",
  "// STATE: None",
  "// RULES: All metadata values are required",
  "// PROVENANCE: Header gate test fixture",
].join("\n");

test("header findings require every metadata field", () => {
  assert.deepEqual(headerFindings(`${completeHeader}\nexport const ok = true;`), []);
  assert.deepEqual(
    headerFindings("export const ok = true;"),
    [
      "<text>: missing or blank metadata fields: "
        + "FEATURE, SURFACE, WHY TOGETHER, STATE, RULES, PROVENANCE",
    ],
  );
});

test("baseline waives legacy debt but not a planted new violation", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-header-gate-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "data/characterization/step5"), { recursive: true });
  await writeFile(join(root, "src/legacy.mjs"), "export const legacy = true;\n");
  await writeFile(
    join(root, "src/planted.mjs"),
    `${completeHeader.replace("// STATE: None", "// STATE:   ")}\n`
      + "export const value = true;\n",
  );
  await writeFile(
    join(root, "data/characterization/step5/legacy-header-exceptions.json"),
    `${JSON.stringify(["src/legacy.mjs"], null, 2)}\n`,
  );
  const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stderr, /src\/legacy\.mjs/);
  assert.match(result.stderr, /src\/planted\.mjs/);
  assert.match(result.stderr, /missing or blank metadata fields: STATE/);
});

test("baseline fails when a listed legacy header is complete", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-header-stale-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src"), { recursive: true });
  await mkdir(join(root, "data/characterization/step5"), { recursive: true });
  await writeFile(
    join(root, "src/legacy.mjs"),
    `${completeHeader}\nexport const legacy = true;\n`,
  );
  await writeFile(
    join(root, "data/characterization/step5/legacy-header-exceptions.json"),
    `${JSON.stringify(["src/legacy.mjs"], null, 2)}\n`,
  );
  const result = spawnSync(process.execPath, [script, root], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /src\/legacy\.mjs: stale legacy header exception/);
});
