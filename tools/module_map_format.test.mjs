import assert from "node:assert/strict";
import test from "node:test";

import { compactModuleFields } from "./module_map_format.mjs";

test("module fields inline when readable and retain wrapped continuations", () => {
  assert.deepEqual(
    compactModuleFields("- module", ["  - exports: `one`"], 40),
    ["- module; exports: `one`"],
  );
  assert.deepEqual(
    compactModuleFields("- long module", ["  - imports: `dependency`"], 20),
    ["- long module", "  - imports: `dependency`"],
  );
  assert.deepEqual(
    compactModuleFields("- module", ["  - exports:", "    `one`"], 40),
    ["- module; exports:", "    `one`"],
  );
});
