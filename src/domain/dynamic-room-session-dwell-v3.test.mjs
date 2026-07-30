// FEATURE:      Dynamic room survey capture tests
// SURFACE:      Run-level dwell configuration, countdown, and extension coverage
// WHY TOGETHER: Configured dwell must reach records, deadlines, and extensions together.
// STATE:        Deterministic mutable test sessions
// RULES:        Invalid durations fall back to the legacy five-second default.
// PROVENANCE:   Runner dynamic-room run-level dwell setting

import assert from "node:assert/strict";
import test from "node:test";

import {
  DYNAMIC_DWELL_CHOICES_SECONDS,
  DYNAMIC_DWELL_DEFAULT_SECONDS,
  checkInDynamicRoomPoint,
  createDynamicRoomSession,
  extendDynamicRoomDwell,
  normalizeDynamicDwellSeconds,
  placeDynamicRoomPoint,
  refreshDynamicRoomDwell,
} from "./dynamic-room-session-v3.mjs";

const AT = "2026-07-30T01:00:00.000Z";
const ROOM = { lng: 170.5085, lat: -45.8724, z: 1, name: "Room one" };

test("run-level dwell drives checkpoint records and the countdown deadline", () => {
  const session = createDynamicRoomSession({ dwellSeconds: 45 });
  assert.equal(session.dwellSeconds, 45);
  placeDynamicRoomPoint(session, ROOM);
  checkInDynamicRoomPoint(session, { at: AT, dwell: true, nowMs: 1_000 });
  assert.equal(session.checkpoints[0].dwellSeconds, 45);
  assert.equal(session.dwell.deadlineMs, 46_000);
  assert.deepEqual(refreshDynamicRoomDwell(session, 44_000), {
    changed: false,
    remainingSeconds: 2,
  });
  assert.deepEqual(refreshDynamicRoomDwell(session, 46_000), {
    changed: true,
    remainingSeconds: 0,
  });
  assert.equal(session.phase, "walking");
});

test("the ten-second extension stacks on the configured dwell", () => {
  const session = createDynamicRoomSession({ dwellSeconds: 15 });
  placeDynamicRoomPoint(session, ROOM);
  checkInDynamicRoomPoint(session, { at: AT, dwell: true, nowMs: 0 });
  const extended = extendDynamicRoomDwell(session, 10_000);
  assert.deepEqual(extended, {
    changed: true,
    deadlineMs: 25_000,
    dwellSeconds: 25,
  });
  assert.deepEqual(refreshDynamicRoomDwell(session, 24_000), {
    changed: false,
    remainingSeconds: 1,
  });
});

test("invalid dwell values fall back to the legacy default", () => {
  assert.equal(normalizeDynamicDwellSeconds(45), 45);
  assert.equal(normalizeDynamicDwellSeconds("30"), 30);
  for (const value of [undefined, null, "", "abc", -5, 0, Number.NaN]) {
    assert.equal(normalizeDynamicDwellSeconds(value), 5);
  }
  assert.equal(createDynamicRoomSession().dwellSeconds, 5);
  assert.equal(createDynamicRoomSession({}).dwellSeconds, 5);
  assert.equal(DYNAMIC_DWELL_DEFAULT_SECONDS, 45);
  assert.deepEqual([...DYNAMIC_DWELL_CHOICES_SECONDS], [5, 15, 30, 45]);
});
