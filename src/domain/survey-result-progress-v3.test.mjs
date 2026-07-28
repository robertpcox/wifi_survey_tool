import assert from "node:assert/strict";
import test from "node:test";

import { validateResultProgressV3 } from "./survey-result-progress-v3.mjs";

function issuesFor(overrides = {}) {
  const result = {
    route: { checkpoints: [{ id: "a" }, { id: "b" }] },
    run: {
      completionStatus: "completed",
      preflight: { sampleId: "poll-1" },
    },
    checkIns: [{ checkpointId: "a" }, { checkpointId: "b" }],
    polls: [{ id: "poll-1" }],
    ...overrides,
  };
  const issues = [];
  validateResultProgressV3(result, issues);
  return issues;
}

test("result progress validates completion, order, and preflight evidence", () => {
  assert.deepEqual(issuesFor(), []);
  assert.match(
    issuesFor({ checkIns: [{ checkpointId: "b" }] }).join("\n"),
    /must follow route checkpoint order.*completed run must include every/s,
  );
  assert.match(
    issuesFor({
      run: {
        completionStatus: "aborted",
        preflight: { sampleId: "missing" },
      },
      checkIns: [],
    }).join("\n"),
    /must reference an exported poll/,
  );
});
