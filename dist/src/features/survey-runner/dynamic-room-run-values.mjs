// FEATURE:      Dynamic room Runner presentation and export values
// SURFACE:      View/map models, definition metadata, and capture snapshot
// WHY TOGETHER: One live session must render and export the same exact checkpoint state.
// STATE:        Reads caller-owned session and active-run state
// RULES:        Background geometry stays hidden; runtime map context is not serialized.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import {
  dynamicRoomDwellRemainingSeconds,
  dynamicRoomMarkState,
} from "../../domain/dynamic-room-session-v3.mjs";

const PHASE = Object.freeze({
  "awaiting-point": "tap-point",
  "pending-point": "pending",
  walking: "walking",
  dwelling: "dwelling",
  finalising: "finalising",
  completed: "completed",
});

export function dynamicRoomViewState(session, state, nowMs) {
  return {
    phase: PHASE[session.phase] ?? "completed",
    busy: state.pointBusy || Boolean(state.finalising && !state.error),
    canBack: !session.captureLocked && (
      Boolean(session.pendingPoint) || session.history.length > 0
    ),
    canFinish: session.stops.length >= 2,
    dwellSeconds: session.dwellSeconds,
    dwellRemainingSeconds: dynamicRoomDwellRemainingSeconds(session, nowMs()),
    marks: dynamicRoomMarkState(session),
    staged: Boolean(session.stagedPoint),
    error: state.error,
    polling: state.polling !== false,
    retryAvailable: session.phase === "finalising" && Boolean(state.error),
    exportReady: Boolean(state.export),
  };
}

export function dynamicRoomWaypoints(session) {
  const dwellingId = session.phase === "dwelling"
    ? session.checkpoints.at(-1)?.id
    : null;
  const committed = session.checkpoints.map(checkpoint => ({
    ...checkpoint,
    state: checkpoint.id === dwellingId ? "current" : "done",
  }));
  const nextIndex = session.markPlan?.nextIndex ?? 0;
  const pendingMarks = (session.markPlan?.marks ?? [])
    .slice(nextIndex)
    .map((mark, index) => ({
      ...mark,
      id: `dynamic-mark-${nextIndex + index + 1}`,
      kind: "mark",
      state: index === 0 ? "current" : "pending",
    }));
  const target = session.pendingPoint ?? session.stagedPoint;
  if (!target) return [...committed, ...pendingMarks];
  return [...committed, ...pendingMarks, {
    ...target,
    id: "dynamic-pending-point",
    kind: "stop",
    state: "current",
  }];
}

export function dynamicDefinitionSeed(template, startedAt) {
  const suffix = String(startedAt).replace(/[^0-9]/g, "").slice(0, 14);
  const provenance = "Live-authored by Runner dynamic room capture; "
    + `site/source profile inherited from ${template.meta.surveyId}.`;
  return {
    meta: {
      ...structuredClone(template.meta),
      surveyName: "Dynamic room survey",
      authorNotes: provenance,
    },
    routeId: `dynamic-room-${suffix || "route"}`,
  };
}

export function dynamicCaptureSnapshot(options) {
  const { state, session } = options;
  return {
    entry: state.entry,
    preflight: state.preflight,
    polls: state.polls,
    checkIns: session.checkIns,
    events: session.events,
    notes: [],
    startedAt: state.startedAt,
    stoppedAt: state.stoppedAt,
    exportedAt: options.nowIso(),
    completionStatus: state.completionStatus,
    operatorComment: options.operatorComment(),
    resultId: options.createId(),
    captureMode: "dynamic-room",
    routeOrigin: "runner-live-authored",
    extraDevices: (state.extraDevices ?? []).map(device => ({
      label: device.label,
      clientIp: device.clientIp,
      slug: device.slug,
      polls: device.polls,
      resultId: options.createId(),
    })),
  };
}
