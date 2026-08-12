// FEATURE:      Report map area-resolution selection
// SURFACE:      node --test src/shared/report-area-selection.test.mjs
// WHY TOGETHER: Room compatibility and strict zone selection form one map-data contract.
// STATE:        Synthetic room and zone summaries
// RULES:        Zone selection never falls back to the legacy room summary.
// PROVENANCE:   Cisco Spaces versus MazeMap room and zone resolution

import assert from "node:assert/strict";
import test from "node:test";

import {
  isAreaHighlight, selectedAreaResolution,
} from "./report-area-selection.mjs";

test("room and zone map modes select only their matching summary", () => {
  const legacyRoom = { id: "legacy-room" };
  const room = { id: "room" };
  const zone = { id: "zone" };
  assert.equal(isAreaHighlight("room"), true);
  assert.equal(isAreaHighlight("zone"), true);
  assert.equal(isAreaHighlight("accuracy"), false);
  assert.equal(selectedAreaResolution({ areaResolution: legacyRoom }, "room"), legacyRoom);
  assert.equal(selectedAreaResolution({ areaResolution: legacyRoom }, "zone"), null);
  assert.equal(selectedAreaResolution({
    areaResolution: legacyRoom, areaResolutions: { room, zone },
  }, "room"), room);
  assert.equal(selectedAreaResolution({ areaResolutions: { room, zone } }, "zone"), zone);
});
