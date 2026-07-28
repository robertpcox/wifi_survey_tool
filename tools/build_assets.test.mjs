import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  V3_APPS,
  stageDistribution,
  verifyDistribution,
} from "./build_assets.mjs";

const repositoryRoot = resolve(new URL("../", import.meta.url).pathname);

test("distribution staging emits self-contained app entries without tests", async t => {
  const destination = await mkdtemp(join(tmpdir(), "wifi-dist-"));
  t.after(() => rm(destination, { recursive: true, force: true }));
  const result = await stageDistribution(repositoryRoot, destination);
  assert.ok(result.files > 20);
  for (const app of V3_APPS) {
    const html = await readFile(join(destination, app, "index.html"), "utf8");
    assert.match(html, new RegExp(`src/apps/${app}/main\\.mjs`));
  }
  const root = await readFile(join(destination, "index.html"), "utf8");
  assert.match(root, /\.\/src\/apps\/dashboard\/main\.mjs/);
  assert.deepEqual(await verifyDistribution(destination), result);
});
