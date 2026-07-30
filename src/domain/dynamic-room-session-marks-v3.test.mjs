// FEATURE:      Dynamic room survey capture tests
// SURFACE:      Staged-target selection, mark taps, skips, and mark-aware undo
// WHY TOGETHER: Staging during dwell and optional mark evidence form one contract.
// STATE:        Deterministic mutable test sessions
// RULES:        Staging never ends the dwell and untapped marks leave no records.
// PROVENANCE:   Structured dynamic capture request

import assert from "node:assert/strict";
import test from "node:test";

import {
  armDynamicRoomMarks,
  cancelStagedDynamicRoomPoint,
  checkInDynamicRoomPoint,
  createDynamicRoomSession,
  dynamicRoomMarkState,
  passDynamicRoomMark,
  placeDynamicRoomPoint,
  refreshDynamicRoomDwell,
  skipDynamicRoomMark,
  undoDynamicRoomMarkEntry,
  undoLastDynamicRoomCheckIn,
} from "./dynamic-room-session-v3.mjs";

const AT = "2026-07-30T01:00:00.000Z";
const ROOM_A = { lng: 170.5085, lat: -45.8724, z: 1, name: "Room A" };
const ROOM_B = { lng: 170.5085, lat: -45.8722, z: 1, name: "Room B" };
const MARKS = [
  { lng: 170.50850, lat: -45.87231, z: 1, legId: "leg-1", spacingBasisM: 5 },
  { lng: 170.50850, lat: -45.87227, z: 1, legId: "leg-1", spacingBasisM: 5 },
];

function dwellingSession() {
  const session = createDynamicRoomSession({ dwellSeconds: 15, markSpacingM: 5 });
  placeDynamicRoomPoint(session, ROOM_A);
  checkInDynamicRoomPoint(session, { at: AT, dwell: true, nowMs: 0 });
  return session;
}

test("staging during dwell never ends the dwell and stays replaceable", () => {
  const session = dwellingSession();
  assert.equal(session.checkpoints[0].spacingBasisM, 5);
  const staged = placeDynamicRoomPoint(session, ROOM_B);
  assert.deepEqual(
    [staged.staged, session.phase, session.pendingPoint],
    [true, "dwelling", null],
  );
  placeDynamicRoomPoint(session, { ...ROOM_B, name: "Room C" });
  assert.equal(session.stagedPoint.name, "Room C");
  assert.equal(cancelStagedDynamicRoomPoint(session).changed, true);
  assert.equal(session.stagedPoint, null);
  assert.equal(session.phase, "dwelling");
  placeDynamicRoomPoint(session, ROOM_B);
  refreshDynamicRoomDwell(session, 16_000);
  assert.equal(session.phase, "pending-point");
  assert.equal(session.pendingPoint.name, "Room B");
  assert.equal(session.stagedPoint, null);
  assert.equal(session.pendingFromPhase, "walking");
});

test("mark taps record planned-convention intermediate checkpoints", () => {
  const session = dwellingSession();
  placeDynamicRoomPoint(session, ROOM_B);
  refreshDynamicRoomDwell(session, 16_000);
  assert.equal(armDynamicRoomMarks(session, { legId: "leg-1", marks: MARKS }).total, 2);
  const passed = passDynamicRoomMark(session, { at: AT });
  assert.deepEqual(passed.checkpoint, {
    id: "checkpoint-2",
    sequence: 1,
    type: "intermediate",
    lng: MARKS[0].lng,
    lat: MARKS[0].lat,
    z: 1,
    stopId: null,
    legId: "leg-1",
    spacingBasisM: 5,
    dwellSeconds: 0,
  });
  assert.deepEqual(session.checkIns.at(-1), {
    checkpointId: "checkpoint-2",
    at: AT,
    groundTruth: { lng: MARKS[0].lng, lat: MARKS[0].lat, z: 1 },
  });
  assert.equal(skipDynamicRoomMark(session).changed, true);
  assert.deepEqual(dynamicRoomMarkState(session), {
    consumed: 2, total: 2, remaining: 0, pending: [],
  });
  assert.equal(passDynamicRoomMark(session, { at: AT }).reason, "marks-complete");
  assert.equal(undoDynamicRoomMarkEntry(session).changed, true);
  assert.equal(dynamicRoomMarkState(session).remaining, 1);
  const arrival = checkInDynamicRoomPoint(session, { at: AT });
  assert.deepEqual(
    [arrival.stop.id, arrival.checkpoint.id, arrival.checkpoint.sequence],
    ["stop-2", "checkpoint-3", 2],
  );
  assert.deepEqual(arrival.legRequest, {
    index: 0, fromStopId: "stop-1", toStopId: "stop-2",
  });
  assert.equal(session.markPlan, null);
});

test("undo unwinds mark check-ins before stop check-ins", () => {
  const session = dwellingSession();
  placeDynamicRoomPoint(session, ROOM_B);
  refreshDynamicRoomDwell(session, 16_000);
  armDynamicRoomMarks(session, { legId: "leg-1", marks: MARKS });
  passDynamicRoomMark(session, { at: AT });
  passDynamicRoomMark(session, { at: AT });
  checkInDynamicRoomPoint(session, { at: AT });
  assert.equal(session.checkpoints.length, 4);
  assert.equal(undoLastDynamicRoomCheckIn(session).stop.id, "stop-2");
  const markUndo = undoLastDynamicRoomCheckIn(session);
  assert.equal(markUndo.entry.kind, "mark");
  assert.equal(session.checkpoints.length, 2);
  assert.equal(session.stops.length, 1);
  assert.equal(session.checkIns.length, 2);
  assert.equal(
    session.events.some(event => event.checkpointId === "checkpoint-3"),
    false,
  );
});

test("marks only arm against the promoted pending target", () => {
  const session = createDynamicRoomSession({ markSpacingM: 5 });
  assert.equal(
    armDynamicRoomMarks(session, { legId: "leg-1", marks: MARKS }).reason,
    "no-pending-target",
  );
  placeDynamicRoomPoint(session, ROOM_A);
  assert.equal(armDynamicRoomMarks(session, { legId: "leg-1", marks: [] }).reason, "no-marks");
  assert.equal(passDynamicRoomMark(session, { at: AT }).reason, "no-marks");
  assert.equal(skipDynamicRoomMark(session).reason, "no-marks");
  assert.equal(undoDynamicRoomMarkEntry(session).reason, "no-mark-entry");
});
