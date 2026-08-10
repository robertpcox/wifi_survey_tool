// FEATURE:      Reviewed survey-result exceptions
// SURFACE:      Node test for reviewed-exceptions-v3.mjs
// WHY TOGETHER: Valid and dangling sidecars prove the immutable evidence boundary.
// STATE:        One compact v3 result fixture
// RULES:        Interval anchors must name adjacent captured checkpoints on the exact route.
// PROVENANCE:   Scope/contracts/survey_lineage_and_exceptions.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { validateReviewedExceptionsV3 } from "./reviewed-exceptions-v3.mjs";

const result = JSON.parse(await readFile(
  new URL("../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("a reviewed interval names exact deployed result and route evidence", () => {
  const sidecar = reviewed();
  const validation = validateReviewedExceptionsV3(
    sidecar,
    new Map([[result.run.resultId, result]]),
  );
  assert.deepEqual(validation, { valid: true, errors: [] });
});

test("unknown results and non-adjacent anchors are rejected", () => {
  const unknown = reviewed();
  unknown.exceptions[0].resultId = "missing";
  assert.match(
    validateReviewedExceptionsV3(unknown, new Map()).errors.join("; "),
    /must name a deployed result/,
  );
  const invalid = reviewed();
  invalid.exceptions[0].routeAnchor.toCheckpointId = "checkpoint-c";
  assert.match(
    validateReviewedExceptionsV3(
      invalid,
      new Map([[result.run.resultId, result]]),
    ).errors.join("; "),
    /checkpoints must be adjacent/,
  );
});

function reviewed() {
  return {
    schemaVersion: 3,
    exceptions: [{
      id: "review-1",
      resultId: result.run.resultId,
      routeHash: result.run.routeHash,
      routeAnchor: {
        type: "checkpoint-interval",
        routeHash: result.run.routeHash,
        fromCheckpointId: "checkpoint-a",
        toCheckpointId: "checkpoint-b",
        legId: "leg-a-c",
      },
      code: "missing-check-in",
      reason: "Ground truth is not defensible for this captured interval.",
      disposition: "exclude-interval",
      reviewer: "fixture-reviewer",
      recordedAt: "2026-08-10T00:00:00.000Z",
    }],
  };
}
