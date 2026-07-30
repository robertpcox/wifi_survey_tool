// FEATURE:      Dynamic room survey capture
// SURFACE:      Staged-target spacing marks: arm, pass, skip, undo, and view state
// WHY TOGETHER: Mark taps must share the session's permanent checkpoint identity.
// STATE:        Mutates the caller-owned dynamic session mark plan
// RULES:        Marks are optional taps; untapped marks never create checkpoints or check-ins.
// PROVENANCE:   Structured dynamic capture request

import { dynamicRoomTimestamp } from "./dynamic-room-session-values-v3.mjs";

export function normalizeDynamicMarkSpacingM(value) {
  const spacing = Number(value);
  return Number.isFinite(spacing) && spacing > 0 ? spacing : 0;
}

export function cancelStagedDynamicRoomPoint(session) {
  if (!session.stagedPoint) return unchanged("no-staged-point");
  session.stagedPoint = null;
  return { changed: true };
}

export function armDynamicRoomMarks(session, plan) {
  if (session.phase !== "pending-point" || !session.pendingPoint) {
    return unchanged("no-pending-target");
  }
  const marks = Array.isArray(plan?.marks) ? plan.marks : [];
  if (!marks.length) return unchanged("no-marks");
  session.markPlan = {
    legId: String(plan.legId),
    marks: structuredClone(marks),
    nextIndex: 0,
  };
  return { changed: true, total: marks.length };
}

export function passDynamicRoomMark(session, options) {
  const plan = session.markPlan;
  if (session.phase !== "pending-point" || !plan) return unchanged("no-marks");
  if (plan.nextIndex >= plan.marks.length) return unchanged("marks-complete");
  const at = dynamicRoomTimestamp(options?.at);
  const mark = plan.marks[plan.nextIndex];
  const sequence = session.checkpoints.length;
  const checkpoint = {
    id: `checkpoint-${sequence + 1}`,
    sequence,
    type: "intermediate",
    lng: mark.lng,
    lat: mark.lat,
    z: mark.z,
    stopId: null,
    legId: plan.legId,
    spacingBasisM: mark.spacingBasisM,
    dwellSeconds: 0,
  };
  const checkIn = {
    checkpointId: checkpoint.id,
    at,
    groundTruth: { lng: mark.lng, lat: mark.lat, z: mark.z },
  };
  const event = { type: "checkpoint-reached", at, checkpointId: checkpoint.id };
  session.checkpoints.push(checkpoint);
  session.checkIns.push(checkIn);
  session.events.push(event);
  session.history.push({
    kind: "mark",
    checkpointId: checkpoint.id,
    markIndex: plan.nextIndex,
    at,
  });
  plan.nextIndex++;
  return { changed: true, checkpoint, checkIn, event };
}

export function skipDynamicRoomMark(session) {
  const plan = session.markPlan;
  if (session.phase !== "pending-point" || !plan) return unchanged("no-marks");
  if (plan.nextIndex >= plan.marks.length) return unchanged("marks-complete");
  session.history.push({ kind: "mark-skip", markIndex: plan.nextIndex });
  plan.nextIndex++;
  return { changed: true, skippedIndex: plan.nextIndex - 1 };
}

export function undoDynamicRoomMarkEntry(session) {
  const entry = session.history.at(-1);
  if (!entry || !["mark", "mark-skip"].includes(entry.kind)) {
    return unchanged("no-mark-entry");
  }
  session.history.pop();
  if (entry.kind === "mark") {
    session.checkpoints.pop();
    session.checkIns.pop();
    session.events = session.events.filter(
      event => event.checkpointId !== entry.checkpointId,
    );
  }
  if (session.markPlan) session.markPlan.nextIndex = entry.markIndex;
  return { changed: true, entry };
}

export function dynamicRoomMarkState(session) {
  const plan = session.markPlan;
  if (!plan) return null;
  return {
    consumed: plan.nextIndex,
    total: plan.marks.length,
    remaining: plan.marks.length - plan.nextIndex,
    pending: plan.marks.slice(plan.nextIndex),
  };
}

function unchanged(reason) {
  return { changed: false, reason };
}
