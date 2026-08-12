// FEATURE:      Report area-resolution map legends
// SURFACE:      renderAreaResolutionLegends()
// WHY TOGETHER: Room and zone modes share one visual grammar but name distinct polygon truth.
// STATE:        None
// RULES:        Zone copy never implies that a containing room or floor outline is a zone match.
// PROVENANCE:   Cisco Spaces versus MazeMap room and zone resolution

export function renderAreaResolutionLegends() {
  return `${legend("room", "Scored room/corridor areas",
    "room window endpoint or corridor checkpoint")}
    ${legend("zone", "Scored MazeMap zones", "zone observation endpoint")}`;
}

function legend(kind, subject, endpoint) {
  return `<span class="map-room-legend" data-highlight-legend="${kind}" hidden>
    ${subject} · resolved percentage:
    <i class="area-scale" aria-hidden="true"></i>
    red = 0% · amber = 50% · green = 100%
    · <i class="expected-position" aria-hidden="true"></i> orange = surveyed position
    · <i class="cisco-position" aria-hidden="true"></i> blue = raw Cisco position returned
    (${endpoint})
    · matched areas remain green; only outside/wrong-floor blue dots are shown
    · successful blue dots are hidden
    · red/orange rim = outside/wrong floor
    · blue dotted connector = same-floor expected → raw displacement
    · no-fix and catch-up states stay in report detail
  </span>`;
}
