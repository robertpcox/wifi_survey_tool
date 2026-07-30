// FEATURE:      Runner setup display formatting tests
// SURFACE:      Missing and complete preflight evidence
// WHY TOGETHER: Plain field output and timing share the same UI contract.
// STATE:        None
// RULES:        Missing evidence remains visibly unknown.
// PROVENANCE:   Runner setup and preflight interface

import assert from "node:assert/strict";
import test from "node:test";
import {
  formatDuration,
  preflightMetrics,
  preflightReasonText,
} from "./form-view-format.mjs";

test("format helpers keep missing and complete evidence readable", () => {
  assert.deepEqual(preflightMetrics(null, 1000), {
    position: "No position", floor: "—", age: "—", rtt: "—",
  });
  assert.equal(formatDuration(65), "1 min 5 s");
  assert.equal(preflightReasonText({ reasons: [] }), "All preflight checks passed.");
});
