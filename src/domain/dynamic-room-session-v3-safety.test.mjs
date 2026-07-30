// FEATURE:      Dynamic room survey safety
// SURFACE:      Dwell extension, cancel, undo, and finalisation tests
// WHY TOGETHER: Mobile correction and finish locking protect one live-authored route.
// STATE:        Deterministic mutable test sessions
// RULES:        Expired dwell cannot extend; Finish keeps polling until completion.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import assert from "node:assert/strict";
import test from "node:test";

import {
  cancelDynamicRoomPoint,
  checkInDynamicRoomPoint,
  completeDynamicRoomSession,
  createDynamicRoomSession,
  extendDynamicRoomDwell,
  placeDynamicRoomPoint,
  requestDynamicRoomFinish,
  undoLastDynamicRoomCheckIn,
} from "./dynamic-room-session-v3.mjs";

const AT = [
  "2026-07-30T01:00:00.000Z",
  "2026-07-30T01:00:20.000Z",
  "2026-07-30T01:00:30.000Z",
];
const POINTS = [
  { lng: 170.5, lat: -45.8, z: 0 },
  { lng: 170.6, lat: -45.9, z: 0 },
];

function checkIn(session, index, options = {}) {
  placeDynamicRoomPoint(session, POINTS[index]);
  return checkInDynamicRoomPoint(session, { at: AT[index], ...options });
}

test("dwell extends repeatedly only before its absolute deadline", () => {
  const session = createDynamicRoomSession();
  checkIn(session, 0, { dwell: true, nowMs: 1_000 });
  assert.equal(extendDynamicRoomDwell(session, 5_999).dwellSeconds, 15);
  assert.equal(extendDynamicRoomDwell(session, 15_999).dwellSeconds, 25);
  assert.equal(session.dwell.deadlineMs, 26_000);
  assert.deepEqual(extendDynamicRoomDwell(session, 26_000), {
    changed: false,
    reason: "dwell-expired",
  });
  assert.equal(session.phase, "walking");
  assert.equal(session.checkpoints[0].dwellSeconds, 25);
});

test("cancel removes only a pending tap and undo removes committed truth", () => {
  const session = createDynamicRoomSession();
  placeDynamicRoomPoint(session, POINTS[0]);
  assert.deepEqual(cancelDynamicRoomPoint(session), { changed: true });
  assert.equal(session.phase, "awaiting-point");
  checkIn(session, 0);
  checkIn(session, 1, { dwell: true, nowMs: 100 });
  assert.deepEqual(
    undoLastDynamicRoomCheckIn(session).action,
    { stopId: "stop-2", checkpointId: "checkpoint-2", at: AT[1] },
  );
  assert.equal(session.phase, "walking");
  assert.equal(session.stops.length, 1);
  assert.equal(session.checkIns.length, 1);
  assert.equal(session.events.length, 1);
  assert.equal(session.dwell, null);
  assert.equal(session.routeRevision, 3);
});

test("pending selection must be cancelled before undo", () => {
  const session = createDynamicRoomSession();
  checkIn(session, 0);
  placeDynamicRoomPoint(session, POINTS[1]);
  assert.deepEqual(undoLastDynamicRoomCheckIn(session), {
    changed: false,
    reason: "cancel-pending-point-first",
  });
  assert.equal(session.stops.length, 1);
  assert.equal(session.pendingPoint.lng, POINTS[1].lng);
});

test("Finish locks capture and explicitly keeps polling", () => {
  const session = createDynamicRoomSession();
  checkIn(session, 0);
  checkIn(session, 1, { dwell: true, nowMs: 10_000 });
  assert.deepEqual(
    requestDynamicRoomFinish(session, AT[2], 11_000),
    { changed: true, pollingContinues: true },
  );
  assert.equal(session.phase, "finalising");
  assert.equal(session.captureLocked, true);
  assert.equal(placeDynamicRoomPoint(session, POINTS[0]).changed, false);
  assert.equal(undoLastDynamicRoomCheckIn(session).changed, false);
  assert.deepEqual(completeDynamicRoomSession(session, AT[2], 14_999), {
    changed: false,
    reason: "dwell-active",
  });
  assert.deepEqual(completeDynamicRoomSession(session, AT[2], 15_000), {
    changed: true,
    completed: true,
    pollingContinues: false,
  });
  assert.equal(session.phase, "completed");
});

test("Finish rejects pending, empty, and single-check-in sessions", () => {
  const session = createDynamicRoomSession();
  assert.equal(
    requestDynamicRoomFinish(session, AT[0], 0).reason,
    "finish-unavailable",
  );
  checkIn(session, 0);
  assert.equal(
    requestDynamicRoomFinish(session, AT[1], 1).reason,
    "two-check-ins-required",
  );
  placeDynamicRoomPoint(session, POINTS[1]);
  assert.equal(
    requestDynamicRoomFinish(session, AT[1], 1).reason,
    "pending-point",
  );
});
