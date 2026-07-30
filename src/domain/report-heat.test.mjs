// FEATURE:      Report Player analysis
// SURFACE:      Node test for report-heat.mjs
// WHY TOGETHER: Bucket accumulation and totalling assertions cover one heat shape.
// STATE:        None
// RULES:        Heat outside configured floors or without positive weight is dropped.
// PROVENANCE:   Step 5 report analysis contract

import assert from "node:assert/strict";
import test from "node:test";

import { addHeatPoint, floorHeatBuckets, totalHeatSeconds } from "./report-heat.mjs";

const floors = [{ z: 0, name: "Ground" }, { z: 1, name: "First" }];
const truthAt = z => ({
  at: "2026-07-28T01:00:05.000Z",
  lat: -45.87,
  lng: 170.5,
  z,
});

test("heat accumulates per configured floor and totals across floors", () => {
  const buckets = floorHeatBuckets(floors);
  addHeatPoint(buckets, truthAt(0), 2.5, { pollId: "poll-1" });
  addHeatPoint(buckets, truthAt(1), 1.5, { pollId: "poll-2" });
  assert.equal(buckets.get("0").points.length, 1);
  assert.equal(buckets.get("0").points[0].pollId, "poll-1");
  assert.equal(buckets.get("0").points[0].weightSeconds, 2.5);
  assert.equal(totalHeatSeconds(buckets), 4);
});

test("unknown floors and zero weight never enter the buckets", () => {
  const buckets = floorHeatBuckets(floors);
  addHeatPoint(buckets, truthAt(9), 5, { pollId: "poll-1" });
  addHeatPoint(buckets, truthAt(0), 0, { pollId: "poll-2" });
  addHeatPoint(buckets, null, 5, { pollId: "poll-3" });
  assert.equal(totalHeatSeconds(buckets), 0);
});
