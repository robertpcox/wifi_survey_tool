import assert from "node:assert/strict";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { generateManifests } from "./generate_manifests.mjs";

const fixtures = new URL("../src/domain/fixtures/", import.meta.url);

async function snapshot(directory) {
  const output = {};
  for (const entry of await readdir(directory, { recursive: true })) {
    if (entry.endsWith(".json")) {
      output[entry] = await readFile(join(directory, entry), "utf8");
    }
  }
  return output;
}

test("manifests are deterministic and one new result appends one result entry", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-manifests-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "data/surveys"), { recursive: true });
  await mkdir(join(root, "results"), { recursive: true });
  await cp(
    new URL("definition.valid.json", fixtures),
    join(root, "data/surveys/demo.definition.v3.json"),
  );
  await cp(
    new URL("result.valid.json", fixtures),
    join(root, "results/demo-1.result.v3.json"),
  );

  const firstGenerated = await generateManifests({ root });
  const first = await snapshot(join(root, "data/manifests"));
  await generateManifests({ root });
  assert.deepEqual(await snapshot(join(root, "data/manifests")), first);

  const added = JSON.parse(await readFile(
    new URL("result.valid.json", fixtures),
    "utf8",
  ));
  added.run.resultId = "result-demo-2";
  added.run.exportedAt = "2026-07-28T02:00:31.000Z";
  await writeFile(
    join(root, "results/demo-2.result.v3.json"),
    `${JSON.stringify(added, null, 2)}\n`,
  );
  const secondGenerated = await generateManifests({ root });
  assert.deepEqual(
    secondGenerated.resultManifest.results.slice(0, 1),
    firstGenerated.resultManifest.results,
  );
  assert.equal(secondGenerated.resultManifest.results[1].resultId, "result-demo-2");
  assert.equal(secondGenerated.customers[0].results.length, 2);
});

test("invalid source data fails before manifests are emitted", async t => {
  const root = await mkdtemp(join(tmpdir(), "wifi-invalid-manifest-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "data/surveys"), { recursive: true });
  await cp(
    new URL("definition.invalid-schema-version.json", fixtures),
    join(root, "data/surveys/invalid.json"),
  );
  await assert.rejects(generateManifests({ root }), /schemaVersion: must equal 3/);
  await assert.rejects(readdir(join(root, "data/manifests")), /ENOENT/);
});
