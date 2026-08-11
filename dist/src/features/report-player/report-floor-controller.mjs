// FEATURE:      Report map floor synchronization
// SURFACE:      bindReportFloor(options), renderPlayerFrame(options)
// WHY TOGETHER: Native map changes, Report selection, and Player Follow share one floor state.
// STATE:        Current displayed z-level and one map-floor subscription
// RULES:        MazeMap owns observed floor; only explicit selection or Follow commands a floor.
// PROVENANCE:   Scope/steps/05b_improve_report.md floor correction

import { renderReportMap } from "./render-report-map.mjs";

export function bindReportFloor({ surface, floorInput, initialFloor }) {
  let floor = numericFloor(initialFloor);
  const unsubscribe = surface.onFloorChange?.(syncFromMap) ?? (() => {});
  floorInput.addEventListener("change", event => {
    const selected = numericFloor(event.target.value);
    if (selected == null) return;
    floor = selected;
    void renderReportMap(surface, { floor }, "Rendering selected floor…");
  });

  function syncFromMap(value) {
    const observed = numericFloor(value);
    if (observed == null) return floor;
    floor = observed;
    floorInput.value = String(observed);
    return floor;
  }

  function renderFrame(frame, options) {
    floor = renderPlayerFrame({
      floor,
      floorInput,
      frame,
      options,
      surface,
    });
    return floor;
  }

  return Object.freeze({
    destroy: unsubscribe,
    renderFrame,
    syncFromMap,
    get floor() { return floor; },
  });
}

export function renderPlayerFrame({ floor, floorInput, frame, options, surface }) {
  let nextFloor = floor;
  const render = { frame, snap: options.snap };
  if (options.follow && Number.isFinite(frame.walker?.z)) {
    nextFloor = frame.walker.z;
    floorInput.value = String(nextFloor);
    surface.followWalker(frame.walker);
    render.floor = nextFloor;
  }
  surface.render(render);
  return nextFloor;
}

function numericFloor(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
