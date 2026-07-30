// FEATURE:      Runner selected-map presentation
// SURFACE:      drawRunnerSelection(mapAdapter, definition, mode)
// WHY TOGETHER: Planned and dynamic selections must clear and draw the same layer set.
// STATE:        Caller-owned map layers
// RULES:        Dynamic mode never displays the template survey route.
// PROVENANCE:   Dynamic room survey field workflow

export function drawRunnerSelection(mapAdapter, definition, mode) {
  if (!mapAdapter.ready) return false;
  if (String(mapAdapter.campusId) !== String(definition.meta.campusId)) {
    return false;
  }
  const dynamic = mode === "dynamic-room";
  mapAdapter.drawRoute?.(dynamic ? [] : definition.route.legs);
  mapAdapter.drawStops?.(dynamic ? [] : definition.route.stops);
  mapAdapter.drawWaypoints?.(dynamic ? [] : definition.route.checkpoints);
  mapAdapter.setActiveLeg?.(null);
  mapAdapter.clearTargetMarker?.();
  if (!dynamic) mapAdapter.fitRoute?.(definition.route);
  mapAdapter.resizeMapSoon?.();
  return true;
}
