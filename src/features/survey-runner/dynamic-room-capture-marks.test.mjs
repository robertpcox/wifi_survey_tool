// FEATURE:      Dynamic room staged-mark capture control tests
// SURFACE:      Plan arming, replacement epochs, failure events, and back ordering
// WHY TOGETHER: Async mark planning must never arm against a stale target.
// STATE:        Deterministic session with a resolvable route stub
// RULES:        Planning failures degrade to plain walking with an exported event.
// PROVENANCE:   Structured dynamic capture request

import assert from "node:assert/strict";
import test from "node:test";
import {
  checkInDynamicRoomPoint,
  createDynamicRoomSession,
  passDynamicRoomMark,
  placeDynamicRoomPoint,
  refreshDynamicRoomDwell,
} from "../../domain/dynamic-room-session-v3.mjs";
import {
  createDynamicMarkCapture,
  dynamicRoomBackAction,
} from "./dynamic-room-capture-marks.mjs";

const AT = "2026-07-30T01:00:00.000Z";
const ROOM_A = { lng: 170.5085, lat: -45.8724, z: 1, name: "Room A" };
const ROOM_B = { lng: 170.5085, lat: -45.8722, z: 1, name: "Room B" };

function harness(routeBetween) {
  const session = createDynamicRoomSession({ dwellSeconds: 15, markSpacingM: 5 });
  const renders = [];
  const marks = createDynamicMarkCapture({
    session,
    routeBetween,
    nowIso: () => AT,
    onRender: () => renders.push(session.phase),
  });
  placeDynamicRoomPoint(session, ROOM_A);
  checkInDynamicRoomPoint(session, { at: AT, dwell: true, nowMs: 0 });
  return { marks, renders, session };
}

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

test("a staged plan arms after dwell expiry against the same target", async () => {
  const { marks, session } = harness((from, to) => [from, to]);
  const staged = placeDynamicRoomPoint(session, ROOM_B);
  marks.handleStaged(staged.point);
  await settle();
  assert.equal(session.markPlan, null);
  refreshDynamicRoomDwell(session, 16_000);
  assert.equal(marks.maybeArm(), true);
  assert.equal(session.markPlan.legId, "leg-1");
  assert.equal(session.markPlan.marks.length, 2);
  assert.equal(passDynamicRoomMark(session, { at: AT }).changed, true);
});

test("replacing or cancelling the staged target discards stale plans", async () => {
  const resolvers = [];
  const { marks, session } = harness(
    () => new Promise(resolve => { resolvers.push(resolve); }),
  );
  const first = placeDynamicRoomPoint(session, ROOM_B);
  marks.handleStaged(first.point);
  const second = placeDynamicRoomPoint(session, { ...ROOM_B, name: "Room C" });
  marks.handleStaged(second.point);
  resolvers[0]([ROOM_A, ROOM_B]);
  await settle();
  refreshDynamicRoomDwell(session, 16_000);
  assert.equal(marks.maybeArm(), false);
  assert.equal(session.markPlan, null);
});

test("the resolved staged leg renders while dwelling and clears with the plan", async () => {
  const { marks, renders, session } = harness((from, to) => [from, to]);
  assert.deepEqual(marks.stagedLeg(), []);
  const staged = placeDynamicRoomPoint(session, ROOM_B);
  marks.handleStaged(staged.point);
  await settle();
  assert.equal(session.phase, "dwelling");
  assert.ok(marks.stagedLeg().length >= 2);
  assert.ok(renders.length >= 1);
  assert.equal(marks.previewWaypoints().length, 2);
  assert.equal(marks.previewWaypoints()[0].id, "dynamic-mark-preview-1");
  assert.equal(marks.previewWaypoints()[0].state, "pending");
  const replaced = placeDynamicRoomPoint(session, { ...ROOM_B, name: "Room C" });
  marks.handleStaged(replaced.point);
  assert.deepEqual(marks.stagedLeg(), []);
  await settle();
  assert.ok(marks.stagedLeg().length >= 2);
  assert.equal(dynamicRoomBackAction(session, marks).changed, true);
  assert.deepEqual(marks.stagedLeg(), []);
  assert.deepEqual(marks.previewWaypoints(), []);
});

test("planning failure records an exported event and walking continues", async () => {
  const { marks, session } = harness(() => Promise.reject(new Error("no route")));
  const staged = placeDynamicRoomPoint(session, ROOM_B);
  marks.handleStaged(staged.point);
  await settle();
  const event = session.events.at(-1);
  assert.equal(event.type, "mark-plan-failed");
  assert.equal(event.message, "no route");
  assert.deepEqual(marks.stagedLeg(), []);
  refreshDynamicRoomDwell(session, 16_000);
  assert.equal(marks.maybeArm(), false);
  assert.equal(checkInDynamicRoomPoint(session, { at: AT }).changed, true);
});

test("back cancels the staged target, then marks, then the pending point", async () => {
  const { marks, session } = harness((from, to) => [from, to]);
  const staged = placeDynamicRoomPoint(session, ROOM_B);
  marks.handleStaged(staged.point);
  assert.equal(dynamicRoomBackAction(session, marks).changed, true);
  assert.equal(session.stagedPoint, null);
  assert.equal(session.phase, "dwelling");
  const restaged = placeDynamicRoomPoint(session, ROOM_B);
  marks.handleStaged(restaged.point);
  await settle();
  refreshDynamicRoomDwell(session, 16_000);
  marks.maybeArm();
  passDynamicRoomMark(session, { at: AT });
  const undone = dynamicRoomBackAction(session, marks);
  assert.equal(undone.entry.kind, "mark");
  const cancelled = dynamicRoomBackAction(session, marks);
  assert.equal(cancelled.changed, true);
  assert.equal(session.phase, "walking");
  assert.equal(session.markPlan, null);
});
