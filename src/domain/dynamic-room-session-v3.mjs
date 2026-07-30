// FEATURE:      Dynamic room survey capture
// SURFACE:      Map-point selection, check-in dwell, staging, undo, and finalisation state
// WHY TOGETHER: Live authoring and capture must share permanent checkpoint identity.
// STATE:        One mutable session owned by the active Dynamic Runner
// RULES:        Map truth is exact; dwell uses monotonic deadlines; Finish keeps polling.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import {
  dynamicRoomCheckInRecords,
  dynamicRoomMonotonic,
  exactDynamicRoomPoint,
} from "./dynamic-room-session-values-v3.mjs";
import { normalizeDynamicDwellSeconds }
  from "./dynamic-room-session-dwell-v3.mjs";
import {
  normalizeDynamicMarkSpacingM,
  undoDynamicRoomMarkEntry,
} from "./dynamic-room-session-marks-v3.mjs";

export {
  completeDynamicRoomSession,
  requestDynamicRoomFinish,
} from "./dynamic-room-session-finalise-v3.mjs";
export {
  DYNAMIC_DWELL_CHOICES_SECONDS, DYNAMIC_DWELL_DEFAULT_SECONDS,
  DYNAMIC_DWELL_EXTENSION_SECONDS, DYNAMIC_DWELL_SECONDS,
  dynamicRoomDwellRemainingSeconds, extendDynamicRoomDwell,
  normalizeDynamicDwellSeconds, refreshDynamicRoomDwell,
} from "./dynamic-room-session-dwell-v3.mjs";
export {
  armDynamicRoomMarks, cancelStagedDynamicRoomPoint, dynamicRoomMarkState,
  normalizeDynamicMarkSpacingM, passDynamicRoomMark, skipDynamicRoomMark,
  undoDynamicRoomMarkEntry,
} from "./dynamic-room-session-marks-v3.mjs";

export function createDynamicRoomSession(options) {
  return {
    phase: "awaiting-point",
    captureLocked: false,
    pendingPoint: null,
    pendingFromPhase: null,
    stagedPoint: null,
    markPlan: null,
    dwellSeconds: normalizeDynamicDwellSeconds(options?.dwellSeconds),
    markSpacingM: normalizeDynamicMarkSpacingM(options?.markSpacingM),
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
  if (session.phase === "dwelling") {
    session.stagedPoint = exactDynamicRoomPoint(point);
    return { changed: true, staged: true, point: session.stagedPoint };
  }
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
  session.markPlan = null;
  return { changed: true };
}

export function checkInDynamicRoomPoint(session, options) {
  if (session.phase !== "pending-point") return unchanged("no-pending-point");
  const dwell = options?.dwell === true;
  const dwellSeconds = normalizeDynamicDwellSeconds(session.dwellSeconds);
  const nowMs = dwell ? dynamicRoomMonotonic(options?.nowMs) : null;
  const sequence = session.checkpoints.length;
  const stopIndex = session.stops.length;
  const point = session.pendingPoint;
  const records = dynamicRoomCheckInRecords(
    point,
    sequence,
    options?.at,
    dwell ? dwellSeconds : 0,
    normalizeDynamicMarkSpacingM(session.markSpacingM),
    stopIndex,
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
  session.stagedPoint = null;
  session.markPlan = null;
  session.routeRevision++;
  session.dwell = dwell ? {
    checkpointId: checkpoint.id,
    startedAtMs: nowMs,
    deadlineMs: nowMs + dwellSeconds * 1000,
  } : null;
  session.phase = dwell ? "dwelling" : "walking";
  return {
    changed: true, stop, checkpoint, checkIn, event,
    legRequest: previous ? {
      index: stopIndex - 1, fromStopId: previous.id, toStopId: stop.id,
    } : null,
  };
}

export function undoLastDynamicRoomCheckIn(session) {
  if (!["walking", "dwelling"].includes(session.phase)) {
    return unchanged(session.phase === "pending-point"
      ? "cancel-pending-point-first" : "capture-locked");
  }
  if (session.history.at(-1)?.kind) return undoDynamicRoomMarkEntry(session);
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

function unchanged(reason) {
  return { changed: false, reason };
}
