// FEATURE:      Runner checkpoint navigation
// SURFACE:      createRunnerNavigation(options)
// WHY TOGETHER: Check-in, closed-area skip, Back, and double-tap suppression share action state.
// STATE:        Last accepted action key and monotonic time for one active run
// RULES:        Skips are exception events, never check-ins; Back removes the latest final evidence.
// PROVENANCE:   Android field safety and closed-area Runner feedback

import {
  checkInCurrent,
  skipCurrentCheckpoint,
  undoLastCheckpointAction,
} from "../../domain/runner-progress-v3.mjs";

export const NAVIGATION_DEBOUNCE_MS = 650;

export function createRunnerNavigation(options) {
  const progress = options.state.progress;
  const nowMs = options.nowMs ?? (() => (
    globalThis.performance?.now?.() ?? Date.now()
  ));
  let lastAction = { key: null, atMs: Number.NEGATIVE_INFINITY };

  function accept(key) {
    const atMs = nowMs();
    if (lastAction.key === key
        && atMs - lastAction.atMs < NAVIGATION_DEBOUNCE_MS) {
      return false;
    }
    lastAction = { key, atMs };
    return true;
  }

  function checkIn() {
    if (blocked() || progress.phase !== "walking" || !accept("check-in")) return false;
    const checkpoint = progress.checkpoints[progress.currentIndex];
    const at = options.nowIso();
    const transition = checkInCurrent(progress, at);
    if (!transition.changed) return false;
    options.state.events.push({
      type: "checkpoint-reached",
      at,
      checkpointId: checkpoint.id,
    });
    if (progress.phase === "awaiting-end") {
      options.state.events.push({
        type: "endpoint-hold-started",
        at,
        checkpointId: checkpoint.id,
      });
    }
    if (progress.phase === "dwelling") options.onDwell();
    options.onRefresh();
    return true;
  }

  function skip() {
    if (blocked() || progress.phase !== "walking" || !accept("skip")) return false;
    const checkpoint = progress.checkpoints[progress.currentIndex];
    const at = options.nowIso();
    const transition = skipCurrentCheckpoint(progress, at);
    if (!transition.changed) return false;
    options.state.events.push({
      type: "checkpoint-skipped",
      at,
      checkpointId: checkpoint.id,
      reason: "area-closed",
    });
    options.onRefresh();
    return true;
  }

  function back() {
    if (blocked() || !accept("back")) return false;
    const transition = undoLastCheckpointAction(progress);
    if (!transition.changed) return false;
    removeActionEvidence(options.state.events, transition.action);
    options.onBack();
    options.onRefresh();
    return true;
  }

  function blocked() {
    return Boolean(options.state.completionStatus || options.state.note);
  }

  return Object.freeze({ back, checkIn, skip });
}

function removeActionEvidence(events, action) {
  const actionType = action.outcome === "reached"
    ? "checkpoint-reached"
    : "checkpoint-skipped";
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index];
    const sameCheckpoint = event.checkpointId === action.checkpointId;
    if (sameCheckpoint && event.type === "endpoint-hold-started") {
      events.splice(index, 1);
      continue;
    }
    if (sameCheckpoint && event.type === actionType && event.at === action.at) {
      events.splice(index, 1);
      return;
    }
  }
}
