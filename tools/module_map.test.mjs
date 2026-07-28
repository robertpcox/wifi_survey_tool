// FEATURE:      Generated source-module inventory verification
// SURFACE:      node --test tools/module_map.test.mjs
// WHY TOGETHER: Extraction, sharded output, determinism, and refresh share one CLI contract
// STATE:        Temporary fixture repositories per test
// RULES:        Generated documents retain every module fact and remain under context targets
// PROVENANCE:   Scope/coding_pattern.md generated module-map requirement

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  copyFile,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const implementation = fileURLToPath(new URL("./module_map.mjs", import.meta.url));
const formatter = fileURLToPath(new URL("./module_map_format.mjs", import.meta.url));
const documents = fileURLToPath(new URL("./module_map_documents.mjs", import.meta.url));

function run(root) {
  return spawnSync(process.execPath, [join(root, "tools/module_map.mjs")], {
    encoding: "utf8",
  });
}

async function generatedDocuments(root) {
  const directory = join(root, "docs");
  const names = (await readdir(directory))
    .filter(name => /^module-map(?:-[a-z0-9-]+)?\.md$/.test(name))
    .sort();
  return Promise.all(names.map(async name => [
    name,
    await readFile(join(directory, name), "utf8"),
  ]));
}

test("module map is deterministic, accurate, and exposes a stale snapshot", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-module-map-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const copiedTool = join(root, "tools/module_map.mjs");
  await mkdir(dirname(copiedTool), { recursive: true });
  await copyFile(implementation, copiedTool);
  await copyFile(formatter, join(root, "tools/module_map_format.mjs"));
  await copyFile(documents, join(root, "tools/module_map_documents.mjs"));
  await mkdir(join(root, "src"), { recursive: true });

  const alpha = [
    "import \"./side.mjs\";",
    "export const zebra = 1;",
    "export function alpha() {}",
    "export { alpha as renamed };",
    "",
  ].join("\n");
  await writeFile(join(root, "src/alpha.mjs"), alpha);
  await writeFile(
    join(root, "src/alpha.test.mjs"),
    "import test from \"node:test\";\ntest(\"placeholder\", () => {});\n",
  );
  await writeFile(join(root, "src/side.mjs"), "export default 1;\n");
  await mkdir(join(root, "src/feature"), { recursive: true });
  await writeFile(join(root, "src/feature/nested.mjs"), "export const nested = 1;\n");
  await writeFile(
    join(root, "src/page.html"),
    "<link href=\"./theme.css\"><script src=\"./alpha.mjs\"></script>\n",
  );
  await writeFile(join(root, "src/theme.css"), "body { color: black; }\n");

  const firstRun = run(root);
  assert.equal(firstRun.status, 0, firstRun.stderr);
  assert.match(firstRun.stdout, /Wrote 3 module-map documents \(5 modules\)/);
  const first = await generatedDocuments(root);
  const output = new Map(first);
  assert.match(output.get("module-map.md"), /5 modules/);
  const rootShard = output.get("module-map-root.md");
  const metric = `4/${Buffer.byteLength(alpha)}`;
  assert.ok(rootShard.includes(`- alpha ${metric} T+`));
  assert.ok(rootShard.includes("E alpha, renamed, zebra"));
  assert.ok(rootShard.includes("I side"));
  assert.ok(rootShard.includes("I alpha, theme.css"));
  assert.match(output.get("module-map-feature.md"), /## \.\/\n- nested .* T-/);
  assert.ok(rootShard.indexOf("- alpha ") < rootShard.indexOf("page.html"));
  for (const [, content] of first) {
    assert.ok(content.split("\n").length <= 151);
    assert.ok(Buffer.byteLength(content) <= 10_000);
  }

  const secondRun = run(root);
  assert.equal(secondRun.status, 0, secondRun.stderr);
  const second = await generatedDocuments(root);
  assert.deepEqual(second, first);

  const staleSnapshot = second;
  await writeFile(join(root, "src/alpha.mjs"), `${alpha}export const added = 2;\n`);
  const changedRun = run(root);
  assert.equal(changedRun.status, 0, changedRun.stderr);
  const currentSnapshot = await generatedDocuments(root);
  assert.notDeepEqual(staleSnapshot, currentSnapshot);
  assert.ok(new Map(currentSnapshot).get("module-map-root.md").includes(
    "E added, alpha, renamed, zebra",
  ));
});
