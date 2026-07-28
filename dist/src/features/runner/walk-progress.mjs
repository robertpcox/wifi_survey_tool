import {
  checkinEvent,
  removeLatestWalkAction,
} from "./walk-events.mjs";

export function createWalkProgress(options) {
  const {
    routeState,
    sessionState,
    mapAdapter,
    walkView,
    captureView,
    setStatus,
    logEvent,
    nowDate,
    vibrate = milliseconds => globalThis.navigator?.vibrate?.(milliseconds),
  } = options;

  function checkin() {
    const walk = sessionState.walk;
    const waypoint = routeState.waypoints[walk.wpIdx];
    if (!waypoint) return;
    walk.history.push({ wpIdx: walk.wpIdx, phase: walk.phase });
    logEvent("checkin", checkinEvent(waypoint));
    waypoint.state = "done";
    vibrate(100);
    updateCheckinCount();
    const arrival = waypoint.kind === "stop" && waypoint.seq > 0;
    const last = walk.wpIdx >= routeState.waypoints.length - 1;
    if (arrival) {
      logEvent("arrive", {
        wpId: waypoint.id,
        wpName: waypoint.name,
        legIdx: waypoint.legIdx,
      });
    }
    if (last) {
      finishWalk({});
      setStatus("ok", "Walk complete — export the session or play it back");
    } else if (arrival) {
      walk.phase = "awaitDepart";
    } else {
      advance();
    }
    refreshWalk();
  }

  function depart() {
    const walk = sessionState.walk;
    const waypoint = routeState.waypoints[walk.wpIdx];
    walk.history.push({ wpIdx: walk.wpIdx, phase: walk.phase });
    logEvent("depart", {
      wpId: waypoint?.id,
      wpName: waypoint?.name,
      legIdx: waypoint?.legIdx,
    });
    walk.phase = "walking";
    advance();
    walkView.updateCard();
    captureView.renderLog(sessionState.events);
  }

  function skipWaypoint() {
    const walk = sessionState.walk;
    if (walk.phase !== "walking" && walk.phase !== "awaitDepart") return;
    const waypoint = routeState.waypoints[walk.wpIdx];
    walk.history.push({ wpIdx: walk.wpIdx, phase: walk.phase });
    logEvent("skip", {
      wpId: waypoint.id,
      wpName: waypoint.name,
      legIdx: waypoint.legIdx,
    });
    waypoint.state = "skipped";
    if (walk.wpIdx >= routeState.waypoints.length - 1) finishWalk();
    else {
      walk.phase = "walking";
      advance();
    }
    refreshWalk();
  }

  function undoCheckin() {
    const walk = sessionState.walk;
    const previous = walk.history.pop();
    if (!previous) return;
    removeLatestWalkAction(sessionState.events);
    const current = routeState.waypoints[walk.wpIdx];
    if (current?.state === "current") current.state = "pending";
    walk.wpIdx = previous.wpIdx;
    walk.phase = previous.phase;
    const waypoint = routeState.waypoints[walk.wpIdx];
    if (waypoint) {
      waypoint.state = "pending";
      setCurrentWaypoint(walk.wpIdx);
    }
    updateCheckinCount();
    refreshWalk();
  }

  function finishWalk(detail) {
    sessionState.walk.phase = "done";
    sessionState.meta.endedAt = nowDate().toISOString();
    logEvent("walk_end", detail || {});
  }

  function advance() {
    sessionState.walk.wpIdx++;
    setCurrentWaypoint(sessionState.walk.wpIdx);
  }

  function setCurrentWaypoint(index) {
    routeState.waypoints.forEach(waypoint => {
      if (waypoint.state === "current") waypoint.state = "pending";
    });
    const waypoint = routeState.waypoints[index];
    if (!waypoint) return;
    waypoint.state = "current";
    mapAdapter.drawWaypoints?.(routeState.waypoints);
    mapAdapter.focusWaypoint?.(waypoint);
  }

  function refreshWalk() {
    mapAdapter.drawWaypoints?.(routeState.waypoints);
    walkView.updateCard();
    captureView.renderLog(sessionState.events);
  }

  function updateCheckinCount() {
    const count = sessionState.events
      .filter(event => event.type === "checkin").length;
    walkView.setCheckinCount(count);
  }

  return {
    checkin,
    depart,
    finishWalk,
    setCurrentWaypoint,
    skipWaypoint,
    undoCheckin,
  };
}
