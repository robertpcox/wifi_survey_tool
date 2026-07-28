// FEATURE:      MazeMap launch failure boundary
// SURFACE:      Recorded launch-error classification tests
// WHY TOGETHER: Fixture classifications and redaction prove the public prompt boundary.
// STATE:        None
// RULES:        Message text alone never proves access denial.
// PROVENANCE:   Scope/steps/05a_recast_player.md recorded-error acceptance

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  classifyMazeMapLaunchError,
  MazeMapLaunchError,
} from "./mazemap-errors.mjs";

const fixtureUrl = new URL(
  "../../../data/fixtures/map/mazemap-launch-errors.fixture.json",
  import.meta.url,
);

test("recorded provider-shaped launch failures retain distinct classifications", async () => {
  const fixtures = JSON.parse(await readFile(fixtureUrl, "utf8"));
  for (const fixture of fixtures.cases) {
    const classified = classifyMazeMapLaunchError(fixture.error, fixture.phase);
    assert.equal(classified.classification, fixture.expected, fixture.id);
    assert.equal(classified.promptForAccess, fixture.expected === "access-denied");
    assert.equal(classified.useFallback, true);
    assert.equal(classified.phase, fixture.phase);
  }
});

test("unstructured authorization words do not become access denial", () => {
  const cause = Error("403 forbidden; token=should-not-be-shown");
  const classified = classifyMazeMapLaunchError(cause, "map-load");
  assert.ok(classified instanceof MazeMapLaunchError);
  assert.equal(classified.classification, "generic");
  assert.equal(classified.promptForAccess, false);
  assert.equal(classified.cause, cause);
  assert.equal(classified.details.message.includes("should-not-be-shown"), false);
});

test("structured nested denial is proved while URLs and bearer values are redacted", () => {
  const cause = {
    error: {
      response: { status: 403 },
      message: "GET https://map.invalid/style?access=secret",
    },
    message: "Bearer private-value",
  };
  const classified = classifyMazeMapLaunchError(cause, "map-load");
  assert.equal(classified.classification, "access-denied");
  assert.equal(classified.details.message, "Bearer [redacted]");
  assert.equal(
    classified.details.cause.message,
    "GET https://map.invalid/style?[redacted]",
  );
});
