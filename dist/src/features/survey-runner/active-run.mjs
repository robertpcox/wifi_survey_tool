import {
  createRunnerProgress,
  finishRunnerProgress,
  startRunnerProgress,
  tickRunnerDwell,
} from "../../domain/runner-progress-v3.mjs";
import { createRunnerNoteCapture } from "./note-capture.mjs";
import { createRunnerNavigation } from "./run-navigation.mjs";
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
  let dwellEpoch = 0;
  let focusedCheckpointId = null;
  const noteCapture = createRunnerNoteCapture({
    state, definition: options.definition,
    pollLoop: options.pollLoop,
    mapAdapter: options.mapAdapter,
    currentPosition: options.currentPosition,
    nowIso,
    onPause: cancelDwell,
    onRender: options.onRender,
    onResume() {
      if (progress.phase === "dwelling") scheduleDwell();
      focusedCheckpointId = null;
      refresh();
    },
  });
  const navigation = createRunnerNavigation({
    state,
    nowIso,
    nowMs: options.nowMs,
    onDwell: scheduleDwell,
    onBack() {
      cancelDwell();
      focusedCheckpointId = null;
    },
    onRefresh: refresh,
  });
  function start() {
    state.startedAt = nowIso();
    state.events.push({ type: "run-started", at: state.startedAt });
    options.pollLoop.start();
    refresh();
    return state;
  }

  function scheduleDwell() {
    cancelDwell();
    const epoch = dwellEpoch;
    dwellTimer = setTimer(() => {
      if (epoch !== dwellEpoch || progress.phase !== "dwelling") return;
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

  function cancelDwell() {
    dwellEpoch++;
    clearTimer(dwellTimer);
    dwellTimer = null;
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
    cancelDwell();
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
      const origin = previous?.state === "skipped" ? options.currentPosition?.() : previous ?? options.currentPosition?.();
      options.mapAdapter.focusWaypoint?.(checkpoint, { origin });
      focusedCheckpointId = checkpoint.id;
    }
    options.onRender(state);
  }

  return Object.freeze({
    addNote: noteCapture.add,
    back: navigation.back,
    cancelNote: noteCapture.cancel,
    checkIn: navigation.checkIn,
    endSession,
    openNote: noteCapture.open,
    placeNote: noteCapture.place,
    start,
    state,
    stop,
    skip: navigation.skip,
  });
}

function activeLegIndex(definition, checkpoint) {
  const legs = definition.route.legs ?? [];
  if (checkpoint.legId) return legs.findIndex(leg => leg.id === checkpoint.legId);
  const incoming = legs.findIndex(leg => leg.toStopId === checkpoint.stopId);
  if (incoming >= 0) return incoming;
  return legs.findIndex(leg => leg.fromStopId === checkpoint.stopId);
}
