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
  const summary = { observations: [{
    resultId: "12345678-rest", checkedInAt: "2026-07-31T01:42:19.000Z",
    checkpointId: "checkpoint-1", roomLabel: "Clinic",
    device: { name: "Phone <one>" },
    expectedRoom: { id: "poi-42", identifier: "K01.07", name: "Clinic" },
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
      outsideDistanceM: 3.25,
      room: { identifier: "C01", name: "Corridor at window end" },
      point: { lng: 3, lat: 4, z: 0 },
    },
  }] };
  const html = renderRoomResolutionEvidence(summary);
  assert.match(html, /12345678/);
  assert.match(html, /01:42:19/);
  assert.match(html, /Caught up within 20 s/);
  assert.match(html, /Cisco resolved area/);
  assert.match(html, /Corridor at window end/);
  assert.match(html, /C01 · Corridor at window end/);
  assert.match(html, /K01\.07/);
  assert.match(html, /3\.3 m/);
  assert.match(html, /Majority inside/);
  assert.match(html, /12\.0 s in · 8\.0 s out \(complete\)/);
  assert.match(html, /<th>Device<\/th>/);
  assert.match(html, /Phone &lt;one&gt;/);
  assert.match(html, /1 of 1 shown/);
  const consolidated = renderRoomResolutionEvidence(summary, { showDevice: false });
  assert.doesNotMatch(consolidated, /<th>Device<\/th>|Phone &lt;one&gt;/);
});
