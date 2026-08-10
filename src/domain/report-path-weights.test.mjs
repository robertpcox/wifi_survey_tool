// FEATURE:      Weighted report path sampling
// SURFACE:      node --test src/domain/report-path-weights.test.mjs
// WHY TOGETHER: Whole-path coverage and conserved duration define the sampling contract.
// STATE:        One straight long corridor
// RULES:        A long freeze must occupy multiple samples without multiplying its seconds.
// PROVENANCE:   Consolidated freeze-path heat

import assert from "node:assert/strict";
import test from "node:test";

import { weightedPathPoints } from "./report-path-weights.mjs";

test("long freeze weight is distributed along the walked path", () => {
  const samples = weightedPathPoints([
    [170, -45], [170.0003, -45],
  ], 2, 55, 2.5);
  assert.ok(samples.length > 5);
  assert.ok(new Set(samples.map(item => item.point.lng.toFixed(6))).size > 5);
  assert.equal(samples.every(item => item.point.z === 2), true);
  const total = samples.reduce((sum, item) => sum + item.weight, 0);
  assert.ok(Math.abs(total - 55) < 1e-9);
});
