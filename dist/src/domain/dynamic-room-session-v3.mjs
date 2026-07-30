// FEATURE:      Dynamic room survey capture
// SURFACE:      Map-point selection, check-in dwell, undo, and finalisation state
// WHY TOGETHER: Live authoring and capture must share permanent checkpoint identity.
// STATE:        One mutable session owned by the active Dynamic Runner
// RULES:        Map truth is exact; dwell uses monotonic deadlines; Finish keeps polling.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import {
  dynamicRoomCheckInRecords,
  dynamicRoomMonotonic,
  exactDynamicRoomPoint,
  remainingDynamicRoomDwellSeconds,
} from "./dynamic-room-session-values-v3.mjs";

export {
  completeDynamicRoomSession,
  requestDynamicRoomFinish,
} from "./dynamic-room-session-finalise-v3.mjs";

export const DYNAMIC_DWELL_SECONDS = 5;
export const DYNAMIC_DWELL_EXTENSION_SECONDS = 10;
export function createDynamicRoomSession() {
  return {
    phase: "awaiting-point",
    captureLocked: false,
    pendingPoint: null,
    pendingFromPhase: null,
    stops: [],
    checkpoints: [],
    checkIns: [],
    events: [],
    history: [],
    dwell: null,
    routeRevision: 0,
    finishRequestedAt: null,
    completedAt: null,
  };
}

export function placeDynamicRoomPoint(session, point) {
  if (!["awaiting-point", "walking"].includes(session.phase)) {
    return unchanged("capture-unavailable");
  }
  session.pendingFromPhase = session.phase;
  session.pendingPoint = exactDynamicRoomPoint(point);
  session.phase = "pending-point";
  return { changed: true, point: session.pendingPoint };
}

export function cancelDynamicRoomPoint(session) {
  if (session.phase !== "pending-point") return unchanged("no-pending-point");
  session.phase = session.pendingFromPhase;
  session.pendingPoint = null;
  session.pendingFromPhase = null;
  return { changed: true };
}

export function checkInDynamicRoomPoint(session, options) {
  if (session.phase !== "pending-point") return unchanged("no-pending-point");
  const dwell = options?.dwell === true;
  const nowMs = dwell ? dynamicRoomMonotonic(options?.nowMs) : null;
  const sequence = session.checkpoints.length;
  const point = session.pendingPoint;
  const records = dynamicRoomCheckInRecords(
    point,
    sequence,
    options?.at,
    dwell ? DYNAMIC_DWELL_SECONDS : 0,
  );
  const { stop, checkpoint, checkIn, event } = records;
  const at = checkIn.at;
  const previous = session.stops.at(-1) ?? null;
  session.stops.push(stop);
  session.checkpoints.push(checkpoint);
  session.checkIns.push(checkIn);
  session.events.push(event);
  session.history.push({ stopId: stop.id, checkpointId: checkpoint.id, at });
  session.pendingPoint = null;
  session.pendingFromPhase = null;
  session.routeRevision++;
  session.dwell = dwell ? {
    checkpointId: checkpoint.id,
    startedAtMs: nowMs,
    deadlineMs: nowMs + DYNAMIC_DWELL_SECONDS * 1000,
  } : null;
  session.phase = dwell ? "dwelling" : "walking";
  return {
    changed: true, stop, checkpoint, checkIn, event,
    legRequest: previous ? {
      index: sequence - 1, fromStopId: previous.id, toStopId: stop.id,
    } : null,
  };
}

export function extendDynamicRoomDwell(session, nowMs) {
  if (session.phase !== "dwelling") return unchanged("not-dwelling");
  const currentMs = dynamicRoomMonotonic(nowMs);
  if (currentMs >= session.dwell.deadlineMs) {
    expireDwell(session);
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
  expireDwell(session);
  return { changed: true, remainingSeconds: 0 };
}

export function dynamicRoomDwellRemainingSeconds(session, nowMs) {
  return remainingDynamicRoomDwellSeconds(session.dwell, nowMs);
}

export function undoLastDynamicRoomCheckIn(session) {
  if (!["walking", "dwelling"].includes(session.phase)) {
    return unchanged(session.phase === "pending-point"
      ? "cancel-pending-point-first" : "capture-locked");
  }
  const action = session.history.pop();
  if (!action) return unchanged("no-check-in");
  const stop = session.stops.pop();
  const checkpoint = session.checkpoints.pop();
  const checkIn = session.checkIns.pop();
  session.events = session.events.filter(
    event => event.checkpointId !== action.checkpointId,
  );
  session.dwell = null;
  session.routeRevision++;
  session.phase = session.stops.length ? "walking" : "awaiting-point";
  return { changed: true, action, stop, checkpoint, checkIn };
}

function expireDwell(session) {
  session.dwell = null;
  session.phase = "walking";
}

function unchanged(reason) {
  return { changed: false, reason };
}
