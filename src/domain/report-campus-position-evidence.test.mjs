// FEATURE:      Consolidated Cisco walking positions
// SURFACE:      node --test src/domain/report-campus-position-evidence.test.mjs
// WHY TOGETHER: Held and lag evidence prove raw Cisco coordinates survive aggregation.
// STATE:        Synthetic analyzed timeline
// RULES:        Ground truth never substitutes for the observed blue-dot position.
// PROVENANCE:   Long-corridor consolidated diagnostics

import assert from "node:assert/strict";
import test from "node:test";

import { campusCiscoWalkingEvidence }
  from "./report-campus-position-evidence.mjs";

test("walking holds and lag retain the unsnapped Cisco coordinate", () => {
  const analysis = {
    timeline: [{
      pollId: "poll-a",
      fix: { lng: 170.6, lat: -45.8, z: 2 },
      groundTruth: { lng: 170.5, lat: -45.8, z: 2 },
    }],
    heatmaps: { sticky: [{
      z: 2, points: [{ pollId: "poll-a", weightSeconds: 55 }],
    }] },
    fixes: { lagSeries: [{
      pollId: "poll-a", moving: true, lagBehindM: 24,
    }] },
  };
  const evidence = campusCiscoWalkingEvidence(analysis);
  assert.deepEqual(evidence.held[0].point, { lng: 170.6, lat: -45.8, z: 2 });
  assert.equal(evidence.held[0].seconds, 55);
  assert.deepEqual(evidence.lag[0].point, evidence.held[0].point);
  assert.equal(evidence.lag[0].lagBehindM, 24);
});
