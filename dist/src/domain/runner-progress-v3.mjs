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
    groundTruth: {
      lng: checkpoint.lng,
      lat: checkpoint.lat,
      z: checkpoint.z,
    },
  });
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
    if (checkpoint.state !== "done") {
      checkpoint.state = index === progress.currentIndex ? "current" : "pending";
    }
  });
}
