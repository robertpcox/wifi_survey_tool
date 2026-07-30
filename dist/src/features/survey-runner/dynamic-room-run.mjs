// FEATURE:      Dynamic room active Runner
// SURFACE:      createDynamicRoomRunner(options)
// WHY TOGETHER: Map taps, exact check-ins, dwell, hidden routing, and finalisation share one session.
// STATE:        One active session, route queue, dwell timer, and paired export
// RULES:        Click truth is exact; polling stops only after Finish finalises every route leg.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import { createDynamicRoomSession }
  from "../../domain/dynamic-room-session-v3.mjs";
import { createDynamicRoomCapture } from "./dynamic-room-capture.mjs";
import { createDynamicRoomFinaliser } from "./dynamic-room-finaliser.mjs";
import { downloadDynamicRoomFile } from "./dynamic-room-download.mjs";
import { createDynamicRouteAuthor } from "./dynamic-route-author.mjs";

export function createDynamicRoomRunner(options) {
  const session = createDynamicRoomSession({
    dwellSeconds: options.dwellSeconds,
    markSpacingM: options.markSpacingM,
  });
  const routeAuthor = options.routeAuthor ?? createDynamicRouteAuthor({
    routeBetween: options.routeBetween,
  });
  const nowDate = options.nowDate ?? (() => new Date());
  const nowMs = options.nowMs ?? (() => (
    globalThis.performance?.now?.() ?? Date.now()
  ));
  const setTimer = options.setTimer
    ?? ((callback, delay) => globalThis.setTimeout(callback, delay));
  const clearTimer = options.clearTimer
    ?? (timer => globalThis.clearTimeout(timer));
  const state = {
    session,
    entry: options.entry,
    preflight: options.preflight,
    polls: options.polls,
    extraDevices: options.extraDevices ?? [],
    events: session.events,
    notes: [],
    note: null,
    startedAt: null,
    stoppedAt: null,
    completionStatus: null,
    export: null,
    error: null,
    pointBusy: false,
    finalising: null,
    finaliseStatus: null,
  };
  const nowIso = () => nowDate().toISOString();
  const capture = createDynamicRoomCapture({
    ...options, session, state, routeAuthor, nowMs, nowIso, setTimer, clearTimer,
  });
  const finaliser = createDynamicRoomFinaliser({
    ...options, session, state, routeAuthor, nowDate, nowMs, nowIso, setTimer,
    onRender: capture.render,
  });

  function start() {
    state.startedAt = nowIso();
    session.events.push({ type: "run-started", at: state.startedAt });
    options.pollLoop.start();
    options.mapAdapter.drawRoute?.([]);
    capture.render();
    return state;
  }

  function download(kind) {
    return downloadDynamicRoomFile(state.export, kind, options);
  }

  function dispose() {
    const captureDisposed = capture.dispose();
    const finaliserDisposed = finaliser.dispose();
    return captureDisposed || finaliserDisposed;
  }

  return Object.freeze({
    back: capture.back,
    checkIn: capture.checkIn,
    dispose,
    download,
    dwell: capture.dwell,
    extendDwell: capture.extendDwell,
    finish: finaliser.finish,
    handleMapClick: capture.handleMapClick,
    passMark: capture.passMark,
    retry: finaliser.retry,
    skipMark: capture.skipMark,
    session,
    start,
    state,
    stop: finaliser.abort,
  });
}
