// FEATURE:      Sharded module-map document verification
// SURFACE:      node --test tools/module_map_documents.test.mjs
// WHY TOGETHER: Partition, index, ordering, and size assertions cover one document contract
// STATE:        None
// RULES:        Every module occurs in one deterministic under-target shard
// PROVENANCE:   Scope/coding_pattern.md generated module-map requirement

import assert from "node:assert/strict";
import test from "node:test";

import { moduleMapDocuments } from "./module_map_documents.mjs";

function row(path, overrides = {}) {
  return {
    path,
    lines: 10,
    bytes: 200,
    test: path.replace(/\.mjs$/, ".test.mjs"),
    exports: [],
    imports: [],
    ...overrides,
  };
}

test("documents shard by source layer and index every deterministic shard", () => {
  const sourceRows = [
    row("src/features/zeta.mjs", { test: null }),
    row("src/domain/value.mjs", { exports: ["value"] }),
    row("src/features/alpha.mjs", { imports: ["@d/value"] }),
  ];
  const first = moduleMapDocuments(sourceRows);
  const second = moduleMapDocuments([...sourceRows].reverse());
  assert.deepEqual(second, first);
  assert.deepEqual(
    first.map(document => document.name),
    ["module-map.md", "module-map-domain.md", "module-map-features.md"],
  );
  assert.match(first[0].content, /module-map-domain\.md/);
  assert.match(first[0].content, /module-map-features\.md/);
  assert.match(first[1].content, /- value 10\/200 T\+ E value/);
  assert.ok(first[2].content.indexOf("- alpha") < first[2].content.indexOf("- zeta"));
  assert.match(first[2].content, /- zeta 10\/200 T-/);
  for (const document of first) {
    assert.ok(document.content.split("\n").length <= 141);
    assert.ok(Buffer.byteLength(document.content) <= 9_000);
  }
});

test("a growing layer is partitioned before either document target", () => {
  const rows = Array.from({ length: 180 }, (_, index) => row(
    `src/features/group-${String(index).padStart(3, "0")}/module.mjs`,
  ));
  const documents = moduleMapDocuments(rows);
  const shards = documents.slice(1);
  assert.ok(shards.length > 1);
  assert.match(documents[0].content, /src\/features\/ \(1\/[2-9]\)/);
  for (const shard of shards) {
    assert.ok(shard.content.split("\n").length <= 141);
    assert.ok(Buffer.byteLength(shard.content) <= 9_000);
  }
});
