// FEATURE:      Report map base-route visibility
// SURFACE:      createReportBaseRoute(adapter, result)
// WHY TOGETHER: Seed route, stop, and checkpoint layers hide and restore as one map context.
// STATE:        Last requested visibility
// RULES:        Consolidated overview never presents its bootstrap result as the campus route.
// PROVENANCE:   Campus-level consolidated report

export function createReportBaseRoute(adapter, result) {
  let visible = true;

  function setVisible(next) {
    visible = Boolean(next);
    adapter?.drawRoute(visible ? result.route.legs : []);
    adapter?.drawStops(visible ? result.route.stops : []);
    adapter?.drawWaypoints(visible ? result.route.checkpoints : []);
    adapter?.drawReportNotes?.(visible ? result.notes ?? [] : []);
    return visible;
  }

  return Object.freeze({
    setVisible,
    get visible() { return visible; },
  });
}
