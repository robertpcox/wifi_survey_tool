// FEATURE:      Room-resolution evidence detail
// SURFACE:      node --test src/features/report-player/room-resolution-evidence-view.test.mjs
// WHY TOGETHER: Run/time traceability, escaping, and dwell outcome copy share one table contract.
// STATE:        One late-settling room visit
// RULES:        Raw identifiers remain traceable without widening the visible table.
// PROVENANCE:   Consolidated dynamic room report

import assert from "node:assert/strict";
import test from "node:test";

import { renderRoomResolutionEvidence }
  from "./room-resolution-evidence-view.mjs";

test("room evidence identifies its run, time, and dwell outcome", () => {
  const html = renderRoomResolutionEvidence({ observations: [{
    resultId: "12345678-rest", checkedInAt: "2026-07-31T01:42:19.000Z",
    checkpointId: "checkpoint-1", roomLabel: "Clinic",
    expectedRoom: { name: "Clinic" }, device: { name: "Phone <one>" },
    resolved: true, dwellFailureMomentCount: 1,
    scored: true, tied: false, windowSeconds: 20, windowComplete: true,
    insideEvidenceSeconds: 12, outsideEvidenceSeconds: 8,
    settleState: "resolved-during-dwell",
    primary: {
      status: "resolved", ageSeconds: 2,
      room: { name: "Clinic" }, point: { lng: 1, lat: 2, z: 0 },
    },
    windowExit: {
      status: "wrong-room", ageSeconds: 7,
      room: { name: "Corridor at window end" }, point: { lng: 3, lat: 4, z: 0 },
    },
  }] });
  assert.match(html, /12345678/);
  assert.match(html, /01:42:19/);
  assert.match(html, /Caught up within 20 s/);
  assert.match(html, /Cisco at window end/);
  assert.match(html, /Corridor at window end/);
  assert.match(html, /Majority inside/);
  assert.match(html, /12\.0 s in · 8\.0 s out \(complete\)/);
  assert.match(html, /Phone &lt;one&gt;/);
  assert.match(html, /1 of 1 shown/);
});
