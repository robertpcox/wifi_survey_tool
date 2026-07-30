// FEATURE:      Dynamic room finalisation
// SURFACE:      Capture locking and route-complete polling hand-off
// WHY TOGETHER: Finish and completion bracket asynchronous background routing.
// STATE:        Finalisation fields on one mutable dynamic session
// RULES:        Finish keeps polling; completion waits for any final planned dwell.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import {
  dynamicRoomMonotonic,
  dynamicRoomTimestamp,
  remainingDynamicRoomDwellSeconds,
} from "./dynamic-room-session-values-v3.mjs";

export function requestDynamicRoomFinish(session, at, nowMs) {
  if (session.phase === "pending-point") return unchanged("pending-point");
  if (!["walking", "dwelling"].includes(session.phase)) {
    return unchanged("finish-unavailable");
  }
  if (session.stops.length < 2) return unchanged("two-check-ins-required");
  const currentMs = dynamicRoomMonotonic(nowMs);
  if (session.phase === "dwelling"
      && remainingDynamicRoomDwellSeconds(session.dwell, currentMs) === 0) {
    session.dwell = null;
  }
  session.captureLocked = true;
  session.finishRequestedAt = dynamicRoomTimestamp(at);
  session.events.push({
    type: "finish-requested",
    at: session.finishRequestedAt,
  });
  session.phase = "finalising";
  return { changed: true, pollingContinues: true };
}

export function completeDynamicRoomSession(session, at, nowMs) {
  if (session.phase !== "finalising") return unchanged("not-finalising");
  if (remainingDynamicRoomDwellSeconds(session.dwell, nowMs) > 0) {
    return unchanged("dwell-active");
  }
  session.completedAt = dynamicRoomTimestamp(at);
  session.events.push({ type: "run-completed", at: session.completedAt });
  session.dwell = null;
  session.phase = "completed";
  return { changed: true, completed: true, pollingContinues: false };
}

function unchanged(reason) {
  return { changed: false, reason };
}
