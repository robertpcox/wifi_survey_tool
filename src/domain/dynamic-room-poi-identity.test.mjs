// FEATURE:      Dynamic room survey POI identity
// SURFACE:      Runtime MazeMap context persisted into standard stop fields
// WHY TOGETHER: Selected POI identity and sanitized checkpoint truth cross one capture boundary.
// STATE:        One deterministic dynamic-room session
// RULES:        Persist id/name only; never leak provider runtime context into check-ins.
// PROVENANCE:   Future room-resolution truth

import assert from "node:assert/strict";
import test from "node:test";

import {
  checkInDynamicRoomPoint,
  createDynamicRoomSession,
  placeDynamicRoomPoint,
} from "./dynamic-room-session-v3.mjs";

test("mapped room identity survives runtime-context sanitization", () => {
  const point = {
    lng: 170.5085,
    lat: -45.8724,
    z: 1,
    name: "Room one",
    _mapContext: { poi: { id: "700", name: "Consult Room" } },
  };
  const session = createDynamicRoomSession();
  placeDynamicRoomPoint(session, point);
  checkInDynamicRoomPoint(session, { at: "2026-07-30T01:00:00.000Z" });
  assert.equal(session.stops[0].poiId, "700");
  assert.equal(session.stops[0].poiName, "Consult Room");
  assert.deepEqual(session.checkIns[0].groundTruth, {
    lng: point.lng, lat: point.lat, z: point.z,
  });
});
