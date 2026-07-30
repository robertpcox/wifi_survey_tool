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

test("completed skips account for route order without faking ground truth", () => {
  const events = [
    {
      type: "checkpoint-skipped",
      at: "2026-07-28T01:00:01.000Z",
      checkpointId: "a",
      reason: "area-closed",
    },
    {
      type: "checkpoint-reached",
      at: "2026-07-28T01:00:02.000Z",
      checkpointId: "b",
    },
  ];
  assert.deepEqual(issuesFor({
    events,
    checkIns: [{
      checkpointId: "b",
      at: "2026-07-28T01:00:02.000Z",
    }],
  }), []);
  events[0].reason = "other";
  assert.match(issuesFor({
    events,
    checkIns: [{
      checkpointId: "b",
      at: "2026-07-28T01:00:02.000Z",
    }],
  }).join("\n"), /reason must be area-closed/);
});

test("exceptional progress requires ordered, correlated, located coverage", () => {
  const events = [{
    type: "checkpoint-skipped",
    at: "2026-07-28T01:00:01.000Z",
    checkpointId: "b",
    reason: "area-closed",
  }];
  const errors = issuesFor({ events, checkIns: [] }).join("\n");
  assert.match(errors, /must follow route checkpoint order/);
  assert.match(errors, /must account for every route checkpoint/);
  assert.match(errors, /must include reached ground truth/);
});
