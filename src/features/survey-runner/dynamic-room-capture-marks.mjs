// FEATURE:      Dynamic room staged-mark capture control
// SURFACE:      createDynamicMarkCapture(options), dynamicRoomBackAction(session, marks)
// WHY TOGETHER: Staged-leg planning, arming, upcoming-leg render state, and undo share one epoch.
// STATE:        One staged-plan epoch and leg geometry owned by the active dynamic capture
// RULES:        Failed mark planning degrades to plain walking; marks stay optional taps.
// PROVENANCE:   Structured dynamic capture request

import {
  armDynamicRoomMarks,
  cancelDynamicRoomPoint,
  cancelStagedDynamicRoomPoint,
  undoDynamicRoomMarkEntry,
  undoLastDynamicRoomCheckIn,
} from "../../domain/dynamic-room-session-v3.mjs";
import { planStagedLegMarks } from "./dynamic-room-marks.mjs";

export function createDynamicMarkCapture(options) {
  const { session } = options;
  let planEpoch = 0;
  let planned = null;
  let legGeometry = [];

  function handleStaged(point) {
    const epoch = ++planEpoch;
    planned = null;
    legGeometry = [];
    if (!(session.markSpacingM > 0) || session.stops.length === 0) return false;
    void planStagedLegMarks({
      fromStop: structuredClone(session.stops.at(-1)),
      target: point,
      spacingM: session.markSpacingM,
      legIndex: session.stops.length - 1,
      routeBetween: options.routeBetween,
    }).then(plan => {
      if (epoch !== planEpoch) return;
      planned = { target: point, plan };
      legGeometry = plan.geometry ?? [];
      maybeArm();
      options.onRender?.();
    }).catch(error => {
      if (epoch !== planEpoch) return;
      session.events.push({
        type: "mark-plan-failed",
        at: options.nowIso(),
        message: error?.message || String(error),
      });
      options.onRender?.();
    });
    return true;
  }

  function previewWaypoints() {
    if (!planned || session.stagedPoint !== planned.target) return [];
    return planned.plan.marks.map((mark, index) => ({
      ...mark,
      id: `dynamic-mark-preview-${index + 1}`,
      kind: "mark",
      state: "pending",
    }));
  }

  function stagedLeg() {
    return legGeometry;
  }

  function maybeArm() {
    if (!planned || session.pendingPoint !== planned.target) return false;
    const armed = armDynamicRoomMarks(session, planned.plan);
    if (armed.changed || armed.reason === "no-marks") planned = null;
    return armed.changed;
  }

  function cancelStaged() {
    const result = cancelStagedDynamicRoomPoint(session);
    if (result.changed) invalidate();
    return result;
  }

  function invalidate() {
    planEpoch++;
    planned = null;
    legGeometry = [];
    return true;
  }

  return Object.freeze({
    cancelStaged, handleStaged, invalidate, maybeArm, previewWaypoints, stagedLeg,
  });
}

export function dynamicRoomBackAction(session, marks) {
  if (session.phase === "pending-point") {
    const undone = undoDynamicRoomMarkEntry(session);
    if (undone.changed) return undone;
    const cancelled = cancelDynamicRoomPoint(session);
    if (cancelled.changed) marks.invalidate();
    return cancelled;
  }
  if (session.phase === "dwelling" && session.stagedPoint) {
    return marks.cancelStaged();
  }
  return undoLastDynamicRoomCheckIn(session);
}
