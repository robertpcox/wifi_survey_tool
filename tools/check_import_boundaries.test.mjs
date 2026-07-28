import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";

import { importBoundaryFindings } from "./check_import_boundaries.mjs";

async function add(root, path, content) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

test("import gate accepts dependency flow and fails planted violations", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-import-gate-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await add(root, "src/shared/time.mjs", "export const now = 1;\n");
  await add(
    root,
    "src/domain/good.mjs",
    "import { now } from \"../shared/time.mjs\";\nexport { now };\n",
  );
  assert.deepEqual(await importBoundaryFindings(root), []);

  await add(
    root,
    "src/domain/planted.mjs",
    "import \"../adapters/files.mjs\";\n",
  );
  await add(
    root,
    "src/apps/creator/cross.mjs",
    "import \"../runner/main.mjs\";\n",
  );
  const findings = await importBoundaryFindings(root);
  assert.equal(findings.length, 2);
  assert.ok(findings.some(finding => finding.includes("forbidden import")));
  assert.ok(findings.some(finding => finding.includes("cross-app import")));
});
