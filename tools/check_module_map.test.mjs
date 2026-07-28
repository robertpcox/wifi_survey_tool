import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { checkModuleMap } from "./check_module_map.mjs";

const generator = fileURLToPath(new URL("./module_map.mjs", import.meta.url));
const formatter = fileURLToPath(new URL("./module_map_format.mjs", import.meta.url));

test("module-map gate passes a generated map and fails a stale one", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-map-freshness-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const tool = join(root, "tools/module_map.mjs");
  await mkdir(dirname(tool), { recursive: true });
  await cp(generator, tool);
  await cp(formatter, join(root, "tools/module_map_format.mjs"));
  await mkdir(join(root, "src"), { recursive: true });
  await writeFile(join(root, "src/example.mjs"), "export const value = 1;\n");
  const generated = spawnSync(process.execPath, [tool], { encoding: "utf8" });
  assert.equal(generated.status, 0, generated.stderr);
  assert.equal(await checkModuleMap(root), true);

  await writeFile(
    join(root, "src/example.mjs"),
    "export const value = 1;\nexport const added = 2;\n",
  );
  assert.equal(await checkModuleMap(root), false);
});
