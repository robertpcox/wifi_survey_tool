import {
  checkInCurrent,
  createRunnerProgress,
  finishRunnerProgress,
  startRunnerProgress,
  tickRunnerDwell,
} from "../../domain/runner-progress-v3.mjs";
import { createRunnerNoteCapture } from "./note-capture.mjs";
export function createActiveRunner(options) {
  const progress = startRunnerProgress(
    createRunnerProgress(options.definition),
  );
  const state = {
    progress,
    events: [],
    notes: [],
    note: null,
    startedAt: null,
    stoppedAt: null,
    completionStatus: null,
  };
  const nowIso = () => options.nowDate().toISOString();
  const setTimer = options.setTimer ?? globalThis.setTimeout;
  const clearTimer = options.clearTimer ?? globalThis.clearTimeout;
  let dwellTimer = null;
  let focusedCheckpointId = null;
  const noteCapture = createRunnerNoteCapture({
    state, definition: options.definition,
    pollLoop: options.pollLoop,
    mapAdapter: options.mapAdapter,
    currentPosition: options.currentPosition,
    nowIso,
    onPause: () => clearTimer(dwellTimer),
    onRender: options.onRender,
    onResume() {
      if (progress.phase === "dwelling") scheduleDwell();
      focusedCheckpointId = null;
      refresh();
    },
  });
  function start() {
    state.startedAt = nowIso();
    state.events.push({ type: "run-started", at: state.startedAt });
    options.pollLoop.start();
    refresh();
    return state;
  }
  function checkIn() {
    if (state.completionStatus || state.note) return;
    const checkpoint = progress.checkpoints[progress.currentIndex];
    const at = nowIso();
    const transition = checkInCurrent(progress, at);
    if (!transition.changed) return;
    state.events.push({
      type: "checkpoint-reached",
      at,
      checkpointId: checkpoint.id,
    });
    if (progress.phase === "awaiting-end") {
      state.events.push({
        type: "endpoint-hold-started",
        at,
        checkpointId: checkpoint.id,
      });
    }
    if (progress.phase === "dwelling") scheduleDwell();
    refresh();
  }

  function scheduleDwell() {
    clearTimer(dwellTimer);
    dwellTimer = setTimer(() => {
      const transition = tickRunnerDwell(progress);
      state.events.push({
        type: "dwell-tick",
        at: nowIso(),
        remainingSeconds: progress.dwellRemainingSeconds,
      });
      if (transition.completed) {
        finish("completed");
        return;
      }
      if (progress.phase === "dwelling") scheduleDwell();
      refresh();
    }, 1000);
  }

  function stop() {
    if (state.completionStatus) return;
    if (progress.phase === "awaiting-end") {
      endSession();
      return;
    }
    finish("aborted");
  }

  function endSession() {
    if (state.completionStatus || state.note) return;
    const transition = finishRunnerProgress(progress);
    if (transition.completed) finish("completed");
  }

  function finish(status) {
    if (state.completionStatus) return;
    state.completionStatus = status;
    state.stoppedAt = nowIso();
    state.events.push({ type: `run-${status}`, at: state.stoppedAt });
    clearTimer(dwellTimer);
    options.pollLoop.stop();
    options.onFinish(state);
  }

  function refresh() {
    options.mapAdapter.drawWaypoints?.(progress.checkpoints);
    const checkpoint = progress.checkpoints[progress.currentIndex];
    if (checkpoint && checkpoint.id !== focusedCheckpointId) {
      options.mapAdapter.setMapZLevel?.(checkpoint.z);
      options.mapAdapter.setActiveLeg?.(
        activeLegIndex(options.definition, checkpoint),
      );
      const previous = progress.checkpoints[progress.currentIndex - 1];
      const origin = previous ?? options.currentPosition?.();
      options.mapAdapter.focusWaypoint?.(checkpoint, { origin });
      focusedCheckpointId = checkpoint.id;
    }
    options.onRender(state);
  }

  return Object.freeze({
    addNote: noteCapture.add,
    cancelNote: noteCapture.cancel,
    checkIn,
    endSession,
    openNote: noteCapture.open,
    placeNote: noteCapture.place,
    start,
    state,
    stop,
  });
}

function activeLegIndex(definition, checkpoint) {
  const legs = definition.route.legs ?? [];
  if (checkpoint.legId) {
    return legs.findIndex(leg => leg.id === checkpoint.legId);
  }
  const incoming = legs.findIndex(leg => leg.toStopId === checkpoint.stopId);
  if (incoming >= 0) return incoming;
  return legs.findIndex(leg => leg.fromStopId === checkpoint.stopId);
}
