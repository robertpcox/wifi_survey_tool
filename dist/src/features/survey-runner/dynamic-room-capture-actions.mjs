// FEATURE:      Dynamic room capture actions
// SURFACE:      createDynamicCaptureActions(options)
// WHY TOGETHER: The unified check-in, dwell extension, and early continue mutate one session.
// STATE:        None; the capture controller owns disposal and timers
// RULES:        One check-in serves marks and stops; stops always dwell on arrival.
// PROVENANCE:   Dynamic/planned walking-experience unification

import {
  checkInDynamicRoomPoint,
  continueDynamicRoomDwell,
  dynamicRoomMarkState,
  extendDynamicRoomDwell,
  passDynamicRoomMark,
  skipDynamicRoomMark,
} from "../../domain/dynamic-room-session-v3.mjs";

export function createDynamicCaptureActions(context) {
  const { session, state, options, marks, active, scheduleDwell, render } = context;

  function commit(dwell) {
    if (!active()) return false;
    const result = checkInDynamicRoomPoint(
      session, { at: options.nowIso(), dwell, nowMs: options.nowMs() });
    if (!result.changed) return false;
    marks.invalidate();
    options.routeAuthor.commitStop(result.stop);
    state.error = null;
    scheduleDwell();
    render();
    return true;
  }

  function checkIn() {
    if (dynamicRoomMarkState(session)?.remaining > 0) {
      return markAction(() => passDynamicRoomMark(session, { at: options.nowIso() }))();
    }
    return commit(true);
  }

  function extendDwell() {
    return dwellAction(() => extendDynamicRoomDwell(session, options.nowMs()));
  }

  function continueDwell() {
    return dwellAction(() => continueDynamicRoomDwell(session, options.nowMs()));
  }

  function dwellAction(action) {
    if (!active()) return false;
    if (!action().changed) return false;
    scheduleDwell();
    render();
    return true;
  }

  function markAction(action) {
    return () => {
      if (!active() || !action().changed) return false;
      render();
      return true;
    };
  }

  return Object.freeze({
    checkIn,
    continueDwell,
    extendDwell,
    skip: markAction(() => skipDynamicRoomMark(session)),
  });
}
