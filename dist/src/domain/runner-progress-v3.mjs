import { checkpointDwellSeconds } from "./checkpoint-dwell-v3.mjs";

export function createRunnerProgress(definition) {
  const stopNames = new Map((definition.route.stops ?? []).map(stop => [
    stop.id,
    stop.name || stop.poiName || stop.tag || stop.id,
  ]));
  const floorNames = definition.meta.zLevelNames ?? {};
  return {
    checkpoints: definition.route.checkpoints.map(checkpoint => ({
      ...checkpoint,
      label: checkpoint.type === "stop"
        ? stopNames.get(checkpoint.stopId) || checkpoint.stopId
        : `Checkpoint ${checkpoint.sequence + 1}`,
      floorLabel: floorNames[String(checkpoint.z)] || `Floor ${checkpoint.z}`,
      state: "pending",
    })),
    currentIndex: 0,
    phase: "ready",
    dwellRemainingSeconds: 0,
    dwellSeconds: definition.meta.route.checkpointDwellSeconds,
    checkIns: [],
    history: [],
  };
}

export function startRunnerProgress(progress) {
  if (!progress.checkpoints.length) throw new Error("Survey has no checkpoints");
  progress.phase = "walking";
  markCurrent(progress);
  return progress;
}

export function checkInCurrent(progress, at) {
  if (progress.phase !== "walking") return { completed: false, changed: false };
  const checkpoint = progress.checkpoints[progress.currentIndex];
  checkpoint.state = "done";
  progress.checkIns.push({
    checkpointId: checkpoint.id,
    at,
    groundTruth: { lng: checkpoint.lng, lat: checkpoint.lat, z: checkpoint.z },
  });
  progress.history.push(checkpointAction(checkpoint, progress.currentIndex, "reached", at));
  if (progress.currentIndex >= progress.checkpoints.length - 1) {
    progress.dwellRemainingSeconds = 0;
    progress.phase = "awaiting-end";
    return { completed: false, changed: true };
  }
  progress.dwellRemainingSeconds = checkpointDwellSeconds(
    checkpoint,
    progress.dwellSeconds,
  );
  if (progress.dwellRemainingSeconds > 0) {
    progress.phase = "dwelling";
    return { completed: false, changed: true };
  }
  return advance(progress);
}

export function skipCurrentCheckpoint(progress, at) {
  if (progress.phase !== "walking") return { completed: false, changed: false };
  const last = progress.currentIndex >= progress.checkpoints.length - 1;
  if (last && progress.checkIns.length === 0) {
    return { completed: false, changed: false };
  }
  const checkpoint = progress.checkpoints[progress.currentIndex];
  checkpoint.state = "skipped";
  progress.history.push(checkpointAction(checkpoint, progress.currentIndex, "skipped", at));
  if (last) {
    progress.dwellRemainingSeconds = 0;
    progress.phase = "awaiting-end";
    return { completed: false, changed: true };
  }
  return advance(progress);
}

export function undoLastCheckpointAction(progress) {
  if (progress.phase === "ready" || progress.phase === "completed") {
    return { completed: false, changed: false };
  }
  const action = progress.history.pop();
  if (!action) return { completed: false, changed: false };
  if (action.outcome === "reached") progress.checkIns.pop();
  progress.currentIndex = action.checkpointIndex;
  progress.phase = "walking";
  progress.dwellRemainingSeconds = 0;
  restoreCheckpointStates(progress);
  return { completed: false, changed: true, action };
}

export function finishRunnerProgress(progress) {
  if (progress.phase !== "awaiting-end") {
    return { completed: false, changed: false };
  }
  progress.phase = "completed";
  return { completed: true, changed: true };
}

export function tickRunnerDwell(progress) {
  if (progress.phase !== "dwelling") return { completed: false, changed: false };
  progress.dwellRemainingSeconds = Math.max(
    0,
    progress.dwellRemainingSeconds - 1,
  );
  if (progress.dwellRemainingSeconds > 0) {
    return { completed: false, changed: true };
  }
  return advance(progress);
}

function advance(progress) {
  if (progress.currentIndex >= progress.checkpoints.length - 1) {
    progress.phase = "awaiting-end";
    return { completed: false, changed: true };
  }
  progress.currentIndex++;
  progress.phase = "walking";
  markCurrent(progress);
  return { completed: false, changed: true };
}

function markCurrent(progress) {
  progress.checkpoints.forEach((checkpoint, index) => {
    if (!["done", "skipped"].includes(checkpoint.state)) {
      checkpoint.state = index === progress.currentIndex ? "current" : "pending";
    }
  });
}

function restoreCheckpointStates(progress) {
  const outcomes = new Map(progress.history.map(action => [
    action.checkpointIndex,
    action.outcome,
  ]));
  progress.checkpoints.forEach((checkpoint, index) => {
    const outcome = outcomes.get(index);
    checkpoint.state = outcome === "reached"
      ? "done"
      : outcome === "skipped"
        ? "skipped"
        : index === progress.currentIndex ? "current" : "pending";
  });
}

function checkpointAction(checkpoint, checkpointIndex, outcome, at) {
  return { checkpointId: checkpoint.id, checkpointIndex, outcome, at };
}
