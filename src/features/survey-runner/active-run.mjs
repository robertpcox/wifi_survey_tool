import {
  checkInCurrent,
  createRunnerProgress,
  startRunnerProgress,
  tickRunnerDwell,
} from "../../domain/runner-progress-v3.mjs";

export function createActiveRunner(options) {
  const progress = startRunnerProgress(
    createRunnerProgress(options.definition),
  );
  const state = {
    progress,
    events: [],
    startedAt: null,
    stoppedAt: null,
    completionStatus: null,
  };
  const nowIso = () => options.nowDate().toISOString();
  const setTimer = options.setTimer ?? globalThis.setTimeout;
  const clearTimer = options.clearTimer ?? globalThis.clearTimeout;
  let dwellTimer = null;
  let focusedCheckpointId = null;

  function start() {
    state.startedAt = nowIso();
    state.events.push({ type: "run-started", at: state.startedAt });
    options.pollLoop.start();
    refresh();
    return state;
  }

  function checkIn() {
    if (state.completionStatus) return;
    const checkpoint = progress.checkpoints[progress.currentIndex];
    const at = nowIso();
    const transition = checkInCurrent(progress, at);
    if (!transition.changed) return;
    state.events.push({
      type: "checkpoint-reached",
      at,
      checkpointId: checkpoint.id,
    });
    if (transition.completed) {
      finish("completed");
      return;
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
    if (!state.completionStatus) finish("aborted");
  }

  function finish(status) {
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
      options.mapAdapter.focusWaypoint?.(checkpoint);
      focusedCheckpointId = checkpoint.id;
    }
    options.onRender(state);
  }

  return Object.freeze({
    checkIn,
    start,
    state,
    stop,
  });
}
