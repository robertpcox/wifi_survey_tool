// FEATURE:      Module-map row formatting verification
// SURFACE:      node --test tools/module_map_format.test.mjs
// WHY TOGETHER: Compact aliases, wrapping, and row notation exercise one formatter contract
// STATE:        None
// RULES:        Formatting retains facts while keeping generated lines readable
// PROVENANCE:   Scope/coding_pattern.md generated module-map requirement

import assert from "node:assert/strict";
import test from "node:test";

import {
  compactImportPath,
  compactModuleFields,
  formatModuleShard,
} from "./module_map_format.mjs";

test("module fields inline when readable and retain wrapped continuations", () => {
  assert.deepEqual(
    compactModuleFields("- module", ["  - exports: `one`"], 40),
    ["- module exports: `one`"],
  );
  assert.deepEqual(
    compactModuleFields("- long module", ["  - imports: `dependency`"], 20),
    ["- long module", "  - imports: `dependency`"],
  );
  assert.deepEqual(
    compactModuleFields("- module", ["  - exports:", "    `one`"], 40),
    ["- module exports:", "    `one`"],
  );
});

test("two-parent imports use the documented compact alias", () => {
  assert.equal(compactImportPath("../../domain/route.mjs"), "@d/route.mjs");
  assert.equal(compactImportPath("../../adapters/map.mjs"), "@a/map.mjs");
  assert.equal(compactImportPath("../../features/view.mjs"), "@f/view.mjs");
  assert.equal(compactImportPath("../../shared/time.mjs"), "@s/time.mjs");
  assert.equal(compactImportPath("./local.mjs"), "local.mjs");
});

test("a shard preserves path, metrics, test status, exports, and imports", () => {
  const output = formatModuleShard("features", [{
    path: "src/features/example/widget.mjs",
    lines: 12,
    bytes: 345,
    test: "src/features/example/widget.test.mjs",
    exports: ["createWidget"],
    imports: ["@d/geometry"],
  }]);
  assert.match(output, /# Module map — src\/features\//);
  assert.match(output, /## example\//);
  assert.match(output, /- widget 12\/345 T\+/);
  assert.match(output, /E createWidget/);
  assert.match(output, /I @d\/geometry/);
});
