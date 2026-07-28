// FEATURE:      Player changed-fix history
// SURFACE:      Fix-time and coordinate-identity reduction tests
// WHY TOGETHER: Identity precedence and failed-poll exclusion form one history proof.
// STATE:        None
// RULES:        Fresh same-position fixes remain distinct when provider fix time changes.
// PROVENANCE:   Scope/contracts/report_analysis.md playback fix-identity acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { playerChangedFixHistory } from "./player-fix-history.mjs";

test("provider fix time wins and failures never enter changed-fix history", () => {
  const polls = [
    poll("one", "2026-01-01T00:00:01Z", 170.1),
    poll("same", "2026-01-01T00:00:01Z", 170.2),
    poll("fresh", "2026-01-01T00:00:02Z", 170.2),
    { id: "failed", success: false, normalized: null },
  ];
  assert.deepEqual(
    playerChangedFixHistory({ polls }).map(item => item.value.id),
    ["one", "fresh"],
  );
});

test("coordinates and floor are the fallback identity without fix time", () => {
  const history = playerChangedFixHistory({
    fixHistory: [
      { lng: 1, lat: 2, z: 0 },
      { lng: 1, lat: 2, z: 0 },
      { lng: 1, lat: 2, z: 1 },
    ],
  });
  assert.deepEqual(history.map(item => item.point.z), [0, 1]);
});

function poll(id, fixTime, lng) {
  return {
    id,
    success: true,
    normalized: { lng, lat: -45.8, z: 0, fixTime },
  };
}
