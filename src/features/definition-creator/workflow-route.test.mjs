// FEATURE:      Creator route review
// SURFACE:      Route result and dwell update tests
// WHY TOGETHER: Metric totals and individual edits share the route result builder.
// STATE:        In-memory route snapshot
// RULES:        Tests prove exact dwell totals after an edit.
// PROVENANCE:   Scope/steps/03_build_creator.md

import assert from "node:assert/strict";
import test from "node:test";

import {
  creatorRouteResult,
  updateCreatorRouteDwell,
} from "./workflow-route.mjs";

const domain = {
  estimateRouteDuration: ({ distanceM, checkpoints }) => {
    const dwellSeconds = checkpoints.reduce(
      (total, checkpoint) => total + checkpoint.dwellSeconds,
      0,
    );
    return {
      walkingSeconds: distanceM,
      dwellSeconds,
      totalSeconds: distanceM + dwellSeconds,
    };
  },
};

test("Creator route result totals per-checkpoint dwell and updates one value", () => {
  const route = creatorRouteResult(
    domain,
    [{ distanceM: 20 }],
    [
      { sequence: 0, dwellSeconds: 0 },
      { sequence: 1, dwellSeconds: 5 },
      { sequence: 2, dwellSeconds: 30 },
    ],
    [],
  );
  assert.deepEqual(route.duration, {
    walkingSeconds: 20,
    dwellSeconds: 35,
    totalSeconds: 55,
  });
  const updated = updateCreatorRouteDwell(domain, route, 1, 0);
  assert.equal(updated.checkpoints[1].dwellSeconds, 0);
  assert.equal(updated.duration.totalSeconds, 50);
});
