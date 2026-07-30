// FEATURE:      Dynamic room capture interactions
// SURFACE:      createDynamicRoomCapture(options)
// WHY TOGETHER: Tap resolution, check-in, dwell timing, undo, and map rendering mutate one session.
// STATE:        One point epoch and dwell timer
// RULES:        Click coordinates stay authoritative and queued route revisions follow committed stops.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import {
  cancelDynamicRoomPoint,
  checkInDynamicRoomPoint,
  extendDynamicRoomDwell,
  placeDynamicRoomPoint,
  refreshDynamicRoomDwell,
  undoLastDynamicRoomCheckIn,
} from "../../domain/dynamic-room-session-v3.mjs";
import { dynamicRoomPointFromMapClick } from "./dynamic-room-point.mjs";
import {
  dynamicRoomViewState,
  dynamicRoomWaypoints,
} from "./dynamic-room-run-values.mjs";

export function createDynamicRoomCapture(options) {
  const { session, state } = options;
  let pointEpoch = 0;
  let dwellTimer = null;
  let disposed = false;

  async function handleMapClick(event) {
    if (disposed || !options.view.acceptsMapPoint()
        || state.pointBusy || session.captureLocked) {
      return false;
    }
    const epoch = ++pointEpoch;
    state.pointBusy = true;
    state.error = null;
    render();
    try {
      const point = await dynamicRoomPointFromMapClick(event, {
        currentZLevel: () => (
          options.mapAdapter.getMapZLevel?.()
          ?? options.mapAdapter.currentZLevel
        ),
        describePoint: options.mapAdapter.describePoint
          ? (...args) => options.mapAdapter.describePoint(...args)
          : undefined,
      });
      if (epoch !== pointEpoch || session.captureLocked) return false;
      const placed = placeDynamicRoomPoint(session, point);
      if (!placed.changed) return false;
      options.mapAdapter.setMapZLevel?.(point.z);
      options.mapAdapter.focusWaypoint?.({ ...point, label: point.name });
      return true;
    } catch (error) {
      state.error = error?.message || String(error);
      return false;
    } finally {
      if (epoch === pointEpoch) state.pointBusy = false;
      render();
    }
  }

  function commit(dwell) {
    if (disposed) return false;
    const result = checkInDynamicRoomPoint(session, {
      at: options.nowIso(),
      dwell,
      nowMs: options.nowMs(),
    });
    if (!result.changed) return false;
    options.routeAuthor.commitStop(result.stop);
    state.error = null;
    scheduleDwell();
    render();
    return true;
  }

  function extendDwell() {
    if (disposed) return false;
    const result = extendDynamicRoomDwell(session, options.nowMs());
    if (!result.changed) return false;
    scheduleDwell();
    render();
    return true;
  }

  function back() {
    if (disposed) return false;
    const result = session.phase === "pending-point"
      ? cancelDynamicRoomPoint(session)
      : undoLastDynamicRoomCheckIn(session);
    if (!result.changed) return false;
    pointEpoch++;
    options.routeAuthor.reviseStops(session.stops);
    scheduleDwell();
    render();
    return true;
  }

  function scheduleDwell() {
    options.clearTimer(dwellTimer);
    dwellTimer = null;
    if (disposed || session.phase !== "dwelling") return;
    dwellTimer = options.setTimer(() => {
      refreshDynamicRoomDwell(session, options.nowMs());
      render();
      scheduleDwell();
    }, 250);
  }

  function render() {
    if (disposed) return false;
    state.polling = Boolean(options.pollLoop.active);
    options.mapAdapter.drawStops?.(session.stops);
    options.mapAdapter.drawWaypoints?.(dynamicRoomWaypoints(session));
    options.view.render(dynamicRoomViewState(session, state, options.nowMs));
    return true;
  }

  function dispose() {
    if (disposed) return false;
    disposed = true;
    pointEpoch++;
    options.clearTimer(dwellTimer);
    dwellTimer = null;
    return true;
  }

  return Object.freeze({
    back,
    checkIn: () => commit(false),
    dispose,
    dwell: () => commit(true),
    extendDwell,
    handleMapClick,
    render,
  });
}
