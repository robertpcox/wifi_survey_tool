// FEATURE:      Dynamic room planned-style HUD
// SURFACE:      dynamicRoomHudState(session), renderDynamicRoomHud, resetDynamicRoomHud
// WHY TOGETHER: Dynamic capture must reuse the planned runner's checkpoint presentation.
// STATE:        Writes the shared run-HUD nodes while a dynamic run is active
// RULES:        Marks and stops share one check-in action; skip only surfaces for marks.
// PROVENANCE:   Dynamic/planned walking-experience unification

import { dynamicRoomMarkState } from "../../domain/dynamic-room-session-v3.mjs";

export function dynamicRoomHudState(session) {
  const marks = dynamicRoomMarkState(session);
  if (session.phase === "pending-point" && marks?.remaining > 0) {
    return {
      progress: `mark ${marks.consumed + 1} of ${marks.total}`,
      target: `Mark ${marks.consumed + 1} of ${marks.total}`,
      floor: floorLabel(session.pendingPoint),
      checkInEnabled: true,
      skipAvailable: true,
    };
  }
  if (session.phase === "pending-point") {
    const ordinal = session.stops.length + 1;
    return {
      progress: `checkpoint ${ordinal}`,
      target: session.pendingPoint?.name || `Checkpoint ${ordinal}`,
      floor: floorLabel(session.pendingPoint),
      checkInEnabled: true,
      skipAvailable: false,
    };
  }
  if (session.phase === "dwelling") {
    const stop = session.stops.at(-1);
    return {
      progress: `checkpoint ${session.stops.length}`,
      target: stop?.name ?? "—",
      floor: floorLabel(stop),
      checkInEnabled: false,
      skipAvailable: false,
    };
  }
  return {
    progress: `${session.stops.length} checked in`,
    target: "Tap the map",
    floor: "—",
    checkInEnabled: false,
    skipAvailable: false,
  };
}

export function renderDynamicRoomHud(find, state) {
  const hud = state.hud;
  if (!hud) return;
  setText(find, "[data-run-progress]", hud.progress);
  setText(find, "[data-current-target]", hud.target);
  setText(find, "[data-current-floor]", hud.floor);
  setText(find, "[data-dwell-countdown]", state.phase === "dwelling"
    ? `${Math.max(0, Math.ceil(Number(state.dwellRemainingSeconds) || 0))} s dwell`
    : hud.checkInEnabled ? "Ready to check in" : "—");
  const checkIn = find('[data-action="check-in"]');
  if (checkIn) checkIn.disabled = !hud.checkInEnabled || Boolean(state.busy);
  const skip = find('[data-action="skip-checkpoint"]');
  if (skip) {
    skip.hidden = !hud.skipAvailable;
    skip.disabled = !hud.skipAvailable || Boolean(state.busy);
  }
}

export function resetDynamicRoomHud(find) {
  const checkIn = find('[data-action="check-in"]');
  if (checkIn) checkIn.disabled = false;
  const skip = find('[data-action="skip-checkpoint"]');
  if (skip) {
    skip.hidden = false;
    skip.disabled = false;
  }
}

function floorLabel(point) {
  const name = point?._mapContext?.floor?.name;
  if (name) return String(name);
  return Number.isFinite(Number(point?.z)) ? `z${Number(point.z)}` : "—";
}

function setText(find, selector, value) {
  const node = find(selector);
  if (node) node.textContent = String(value);
}
