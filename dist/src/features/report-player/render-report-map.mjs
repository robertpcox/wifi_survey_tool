// FEATURE:      Report map repaint lifecycle
// SURFACE:      renderReportMap(surface, update, message)
// WHY TOGETHER: Busy feedback, map drawing, and layout settling form one visible repaint.
// STATE:        None
// RULES:        Draw after the busy state paints; release only after map layout settles and repaints.
// PROVENANCE:   Consolidated report rendering feedback

export function renderReportMap(surface, update, message = "Rendering consolidated map…") {
  const render = async () => {
    surface.render(update);
    if (surface.mapMode === "mazemap") await surface.settleLayout?.();
  };
  return surface.withRendering?.(message, render) ?? render();
}
