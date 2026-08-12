// FEATURE:      Report map area-resolution selection
// SURFACE:      isAreaHighlight(kind), selectedAreaResolution(analysis, kind)
// WHY TOGETHER: Layer visibility and map bounds must read the same room-or-zone summary.
// STATE:        None
// RULES:        The legacy singular summary aliases room only; zone never falls back to room.
// PROVENANCE:   Cisco Spaces versus MazeMap room and zone resolution

export function isAreaHighlight(kind) {
  return kind === "room" || kind === "zone";
}

export function selectedAreaResolution(analysis, kind) {
  if (kind === "zone") return analysis?.areaResolutions?.zone ?? null;
  if (kind === "room") {
    return analysis?.areaResolutions?.room ?? analysis?.areaResolution ?? null;
  }
  return null;
}
