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
  continueDynamicRoomDwell,
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

test("continuing early records the actual elapsed dwell and promotes staging", () => {
  const session = createDynamicRoomSession({ dwellSeconds: 45 });
  placeDynamicRoomPoint(session, ROOM);
  checkInDynamicRoomPoint(session, { at: AT, dwell: true, nowMs: 2_000 });
  session.stagedPoint = { lng: 170.5086, lat: -45.8722, z: 1 };
  const early = continueDynamicRoomDwell(session, 14_400);
  assert.deepEqual(early, { changed: true, dwellSeconds: 12 });
  assert.equal(session.checkpoints[0].dwellSeconds, 12);
  assert.equal(session.phase, "pending-point");
  assert.equal(session.pendingPoint.lng, 170.5086);
  assert.equal(session.stagedPoint, null);
  assert.equal(session.dwell, null);
  assert.equal(continueDynamicRoomDwell(session, 15_000).reason, "not-dwelling");
});

test("continuing after the deadline keeps the fully-stood dwell value", () => {
  const session = createDynamicRoomSession({ dwellSeconds: 15 });
  placeDynamicRoomPoint(session, ROOM);
  checkInDynamicRoomPoint(session, { at: AT, dwell: true, nowMs: 0 });
  extendDynamicRoomDwell(session, 10_000);
  const result = continueDynamicRoomDwell(session, 26_000);
  assert.deepEqual(result, { changed: true, dwellSeconds: 25 });
  assert.equal(session.phase, "walking");
  const immediate = createDynamicRoomSession({ dwellSeconds: 45 });
  placeDynamicRoomPoint(immediate, ROOM);
  checkInDynamicRoomPoint(immediate, { at: AT, dwell: true, nowMs: 0 });
  assert.equal(continueDynamicRoomDwell(immediate, 400).dwellSeconds, 0);
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
