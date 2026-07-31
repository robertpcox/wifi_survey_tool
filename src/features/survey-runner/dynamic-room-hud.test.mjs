// FEATURE:      Dynamic room planned-style HUD tests
// SURFACE:      HUD state derivation, shared-node rendering, and reset coverage
// WHY TOGETHER: The planned checkpoint presentation must describe every dynamic phase.
// STATE:        Deterministic sessions and a fake shared HUD node set
// RULES:        Marks and stops share one check-in action; skip only surfaces for marks.
// PROVENANCE:   Dynamic/planned walking-experience unification

import assert from "node:assert/strict";
import test from "node:test";
import {
  armDynamicRoomMarks,
  checkInDynamicRoomPoint,
  createDynamicRoomSession,
  passDynamicRoomMark,
  placeDynamicRoomPoint,
  refreshDynamicRoomDwell,
} from "../../domain/dynamic-room-session-v3.mjs";
import {
  dynamicRoomHudState,
  renderDynamicRoomHud,
  resetDynamicRoomHud,
} from "./dynamic-room-hud.mjs";

const AT = "2026-07-30T01:00:00.000Z";
const ROOM_A = { lng: 170.5085, lat: -45.8724, z: 1, name: "Room A" };
const ROOM_B = { lng: 170.5085, lat: -45.8722, z: 1 };
const MARKS = [
  { lng: 170.5085, lat: -45.87231, z: 1, legId: "leg-1", spacingBasisM: 5 },
  { lng: 170.5085, lat: -45.87227, z: 1, legId: "leg-1", spacingBasisM: 5 },
];

test("HUD state walks tap, pending, mark, and dwelling phases like a planned run", () => {
  const session = createDynamicRoomSession({ dwellSeconds: 15, markSpacingM: 5 });
  assert.deepEqual(dynamicRoomHudState(session), {
    progress: "0 checked in",
    target: "Tap the map",
    floor: "—",
    checkInEnabled: false,
    skipAvailable: false,
  });
  placeDynamicRoomPoint(session, ROOM_A);
  assert.deepEqual(dynamicRoomHudState(session), {
    progress: "checkpoint 1",
    target: "Room A",
    floor: "z1",
    checkInEnabled: true,
    skipAvailable: false,
  });
  checkInDynamicRoomPoint(session, { at: AT, dwell: true, nowMs: 0 });
  assert.deepEqual(dynamicRoomHudState(session), {
    progress: "checkpoint 1",
    target: "Room A",
    floor: "z1",
    checkInEnabled: false,
    skipAvailable: false,
  });
  placeDynamicRoomPoint(session, ROOM_B);
  refreshDynamicRoomDwell(session, 16_000);
  armDynamicRoomMarks(session, { legId: "leg-1", marks: MARKS });
  assert.deepEqual(dynamicRoomHudState(session), {
    progress: "mark 1 of 2",
    target: "Mark 1 of 2",
    floor: "z1",
    checkInEnabled: true,
    skipAvailable: true,
  });
  passDynamicRoomMark(session, { at: AT });
  passDynamicRoomMark(session, { at: AT });
  assert.deepEqual(dynamicRoomHudState(session), {
    progress: "checkpoint 2",
    target: "Checkpoint 2",
    floor: "z1",
    checkInEnabled: true,
    skipAvailable: false,
  });
});

test("HUD rendering drives the shared nodes and resets them for planned runs", () => {
  const nodes = new Map();
  const node = () => ({ textContent: "", disabled: true, hidden: true });
  const find = selector => {
    if (!nodes.has(selector)) nodes.set(selector, node());
    return nodes.get(selector);
  };
  renderDynamicRoomHud(find, {
    phase: "pending",
    hud: {
      progress: "mark 1 of 2",
      target: "Mark 1 of 2",
      floor: "Level 1",
      checkInEnabled: true,
      skipAvailable: true,
    },
  });
  assert.equal(find("[data-run-progress]").textContent, "mark 1 of 2");
  assert.equal(find("[data-current-target]").textContent, "Mark 1 of 2");
  assert.equal(find("[data-current-floor]").textContent, "Level 1");
  assert.equal(find("[data-dwell-countdown]").textContent, "Ready to check in");
  assert.equal(find('[data-action="check-in"]').disabled, false);
  assert.equal(find('[data-action="skip-checkpoint"]').hidden, false);
  renderDynamicRoomHud(find, {
    phase: "dwelling",
    dwellRemainingSeconds: 12.4,
    hud: { progress: "checkpoint 1", target: "Room A", floor: "z1", checkInEnabled: false },
  });
  assert.equal(find("[data-dwell-countdown]").textContent, "13 s dwell");
  assert.equal(find('[data-action="check-in"]').disabled, true);
  assert.equal(find('[data-action="skip-checkpoint"]').hidden, true);
  renderDynamicRoomHud(find, { phase: "walking" });
  resetDynamicRoomHud(find);
  assert.equal(find('[data-action="check-in"]').disabled, false);
  assert.equal(find('[data-action="skip-checkpoint"]').hidden, false);
});
