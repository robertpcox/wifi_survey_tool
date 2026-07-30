// FEATURE:      Dynamic room survey capture
// SURFACE:      Run-level dwell duration, countdown refresh, and extension
// WHY TOGETHER: One configured dwell must drive deadlines, extensions, and expiry.
// STATE:        Mutates the caller-owned dynamic session dwell
// RULES:        Monotonic deadlines; expiry promotes any staged target to the pending point.
// PROVENANCE:   Runner dynamic-room run-level dwell setting

import {
  dynamicRoomMonotonic,
  remainingDynamicRoomDwellSeconds,
} from "./dynamic-room-session-values-v3.mjs";

export const DYNAMIC_DWELL_SECONDS = 5;
export const DYNAMIC_DWELL_DEFAULT_SECONDS = 45;
export const DYNAMIC_DWELL_CHOICES_SECONDS = Object.freeze([5, 15, 30, 45]);
export const DYNAMIC_DWELL_EXTENSION_SECONDS = 10;

export function normalizeDynamicDwellSeconds(value) {
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds > 0
    ? seconds
    : DYNAMIC_DWELL_SECONDS;
}

export function extendDynamicRoomDwell(session, nowMs) {
  if (session.phase !== "dwelling") return unchanged("not-dwelling");
  const currentMs = dynamicRoomMonotonic(nowMs);
  if (currentMs >= session.dwell.deadlineMs) {
    expireDynamicRoomDwell(session);
    return unchanged("dwell-expired");
  }
  session.dwell.deadlineMs += DYNAMIC_DWELL_EXTENSION_SECONDS * 1000;
  const checkpoint = session.checkpoints.at(-1);
  checkpoint.dwellSeconds += DYNAMIC_DWELL_EXTENSION_SECONDS;
  return {
    changed: true,
    deadlineMs: session.dwell.deadlineMs,
    dwellSeconds: checkpoint.dwellSeconds,
  };
}

export function refreshDynamicRoomDwell(session, nowMs) {
  if (session.phase !== "dwelling") return unchanged("not-dwelling");
  const remainingSeconds = dynamicRoomDwellRemainingSeconds(session, nowMs);
  if (remainingSeconds > 0) return { changed: false, remainingSeconds };
  expireDynamicRoomDwell(session);
  return { changed: true, remainingSeconds: 0 };
}

export function dynamicRoomDwellRemainingSeconds(session, nowMs) {
  return remainingDynamicRoomDwellSeconds(session.dwell, nowMs);
}

function expireDynamicRoomDwell(session) {
  session.dwell = null;
  if (session.stagedPoint) {
    session.pendingPoint = session.stagedPoint;
    session.pendingFromPhase = "walking";
    session.stagedPoint = null;
    session.phase = "pending-point";
    return;
  }
  session.phase = "walking";
}

function unchanged(reason) {
  return { changed: false, reason };
}
