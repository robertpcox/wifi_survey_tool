// FEATURE:      Reviewed exception manifest generation
// SURFACE:      Node test for reviewed_exception_manifests.mjs
// WHY TOGETHER: Missing and dangling sidecars prove safe build-time loading.
// STATE:        Temporary repository roots
// RULES:        No sidecar is empty; an invalid evidence reference fails the build.
// PROVENANCE:   Scope/contracts/survey_lineage_and_exceptions.md

import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadReviewedExceptions } from "./reviewed_exception_manifests.mjs";

const fixture = new URL("../src/domain/fixtures/result.valid.json", import.meta.url);

test("missing sidecars resolve empty and dangling references reject", async t => {
  const root = await mkdtemp(join(tmpdir(), "reviewed-exceptions-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "results"), { recursive: true });
  await cp(fixture, join(root, "results/result.json"));
  const entries = [{ resultId: "result-demo-1", path: "results/result.json" }];
  assert.deepEqual(await loadReviewedExceptions(root, entries), {
    schemaVersion: 3,
    exceptions: [],
  });
  await mkdir(join(root, "data/exceptions"), { recursive: true });
  await writeFile(
    join(root, "data/exceptions/reviewed-exceptions.v3.json"),
    JSON.stringify({
      schemaVersion: 3,
      exceptions: [{ id: "bad", resultId: "missing" }],
    }),
  );
  await assert.rejects(
    loadReviewedExceptions(root, entries),
    /must name a deployed result/,
  );
});
