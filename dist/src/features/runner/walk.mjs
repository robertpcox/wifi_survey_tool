import { appendWalkEvent } from "./walk-events.mjs";
import { createWalkProgress } from "./walk-progress.mjs";

export function createWalkController(options) {
  const {
    routeState,
    sessionState,
    walkView,
    captureView,
    setStatus,
    startPolling,
    isPlaybackActive,
    getRouteName,
    nowMs,
    nowDate,
  } = options;
  const logEvent = (type, detail) =>
    appendWalkEvent(sessionState, type, detail, nowMs);
  const progress = createWalkProgress({
    ...options,
    logEvent,
  });

  function walkMainAction() {
    if (isPlaybackActive()) return;
    const phase = sessionState.walk.phase;
    if (phase === "idle" || phase === "done") startWalk();
    else if (phase === "walking") progress.checkin();
    else if (phase === "awaitDepart") progress.depart();
  }

  function startWalk() {
    if (!routeState.waypoints.length) {
      setStatus("err", "Build the route first");
      return;
    }
    routeState.waypoints.forEach(waypoint => {
      waypoint.state = "pending";
    });
    reset("walking", 0);
    sessionState.meta.startedAt = sessionState.meta.startedAt
      || nowDate().toISOString();
    sessionState.meta.routeName = getRouteName();
    logEvent("walk_start", {
      note: `${routeState.waypoints.length} points, `
        + `${routeState.legs.length} legs`,
    });
    const polling = sessionState.pollRun;
    if (!polling.cloud && !polling.lipi) startPolling();
    progress.setCurrentWaypoint(0);
    walkView.updateCard();
  }

  function endWalk() {
    if (sessionState.walk.phase === "idle") return;
    progress.finishWalk({ note: "ended manually" });
    walkView.updateCard();
    captureView.renderLog(sessionState.events);
  }

  function reset(phase = "idle", wpIdx = -1) {
    sessionState.walk = { phase, wpIdx, history: [] };
  }

  return {
    endWalk,
    isRouteEditingBlocked: () => isPlaybackActive()
      || ["walking", "awaitDepart"].includes(sessionState.walk.phase),
    reset,
    skipWaypoint: progress.skipWaypoint,
    undoCheckin: progress.undoCheckin,
    walkMainAction,
  };
}
