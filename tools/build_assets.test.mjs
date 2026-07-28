import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import {
  V3_APPS,
  stageDistribution,
  verifyDistribution,
} from "./build_assets.mjs";

const repositoryRoot = resolve(new URL("../", import.meta.url).pathname);

test("distribution staging emits app entries and the approved runtime SDK loader", async t => {
  const destination = await mkdtemp(join(tmpdir(), "wifi-dist-"));
  t.after(() => rm(destination, { recursive: true, force: true }));
  const result = await stageDistribution(repositoryRoot, destination);
  assert.ok(result.files > 20);
  for (const app of V3_APPS) {
    const html = await readFile(join(destination, app, "index.html"), "utf8");
    assert.match(html, new RegExp(`src/apps/${app}/main\\.mjs`));
  }
  const creator = await readFile(join(destination, "creator/index.html"), "utf8");
  assert.match(
    creator,
    /\.\.\/src\/features\/definition-creator\/creator\.css/,
  );
  const loader = await readFile(
    join(destination, "src/adapters/map/mazemap-sdk.mjs"),
    "utf8",
  );
  assert.match(loader, /api\.mazemap\.com\/js\/v3\.0\.6\/mazemap\.min\.js/);
  const root = await readFile(join(destination, "index.html"), "utf8");
  assert.match(root, /\.\/src\/apps\/dashboard\/main\.mjs/);
  assert.deepEqual(await verifyDistribution(destination), result);
});

test("distribution still rejects an unapproved external asset URL", async t => {
  const destination = await mkdtemp(join(tmpdir(), "wifi-dist-rogue-"));
  t.after(() => rm(destination, { recursive: true, force: true }));
  await writeFile(
    join(destination, "rogue.mjs"),
    'export const url = "https://unapproved.example/sdk.js";\n',
  );
  await assert.rejects(
    verifyDistribution(destination),
    /external asset URL https:\/\/unapproved\.example\/sdk\.js/,
  );
});
