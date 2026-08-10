// FEATURE:      Report map base-route visibility
// SURFACE:      node --test src/features/report-player/report-base-route.test.mjs
// WHY TOGETHER: Hiding and restoring the three seed-route layers prove one overview rule.
// STATE:        Fake adapter calls
// RULES:        Hiding writes empty evidence; restoring writes the exact result references.
// PROVENANCE:   Campus-level consolidated report

import assert from "node:assert/strict";
import test from "node:test";

import { createReportBaseRoute } from "./report-base-route.mjs";

test("base route clears for overview and restores for per-run modes", () => {
  const calls = [];
  const result = { route: { legs: [1], stops: [2], checkpoints: [3] } };
  const route = createReportBaseRoute({
    drawRoute: value => calls.push(["route", value]),
    drawStops: value => calls.push(["stops", value]),
    drawWaypoints: value => calls.push(["points", value]),
  }, result);
  route.setVisible(false);
  route.setVisible(true);
  assert.deepEqual(calls.slice(0, 3).map(item => item[1]), [[], [], []]);
  assert.equal(calls[3][1], result.route.legs);
  assert.equal(calls[4][1], result.route.stops);
  assert.equal(calls[5][1], result.route.checkpoints);
});
