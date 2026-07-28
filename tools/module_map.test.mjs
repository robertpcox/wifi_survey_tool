import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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

const implementation = fileURLToPath(new URL("./module_map.mjs", import.meta.url));
const formatter = fileURLToPath(new URL("./module_map_format.mjs", import.meta.url));

function run(root) {
  return spawnSync(process.execPath, [join(root, "tools/module_map.mjs")], {
    encoding: "utf8",
  });
}

test("module map is deterministic, accurate, and exposes a stale snapshot", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-module-map-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const copiedTool = join(root, "tools/module_map.mjs");
  await mkdir(dirname(copiedTool), { recursive: true });
  await copyFile(implementation, copiedTool);
  await copyFile(formatter, join(root, "tools/module_map_format.mjs"));
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
  assert.match(firstRun.stdout, /Wrote docs\/module-map\.md \(5 modules\)/);
  const outputPath = join(root, "docs/module-map.md");
  const first = await readFile(outputPath, "utf8");
  const metric = `4/${Buffer.byteLength(alpha)}`;
  assert.ok(first.includes(
    `- alpha ${metric}`,
  ));
  assert.ok(first.includes("E alpha, renamed, zebra"));
  assert.ok(first.includes("I side"));
  assert.ok(first.includes(
    "I alpha, theme.css",
  ));
  assert.match(first, /## feature\/\n- nested .* T-/);
  assert.ok(first.indexOf("- alpha ") < first.indexOf("page.html"));

  const secondRun = run(root);
  assert.equal(secondRun.status, 0, secondRun.stderr);
  const second = await readFile(outputPath, "utf8");
  assert.equal(second, first);

  const staleSnapshot = second;
  await writeFile(join(root, "src/alpha.mjs"), `${alpha}export const added = 2;\n`);
  const changedRun = run(root);
  assert.equal(changedRun.status, 0, changedRun.stderr);
  const currentSnapshot = await readFile(outputPath, "utf8");
  assert.notEqual(staleSnapshot, currentSnapshot);
  assert.ok(currentSnapshot.includes(
    "E added, alpha, renamed, zebra",
  ));
});
