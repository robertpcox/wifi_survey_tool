// FEATURE:      Report map surface visibility
// SURFACE:      createMapSurfaceVisibility(options)
// WHY TOGETHER: MazeMap/fallback visibility and live status must switch atomically.
// STATE:        Supplied map, fallback, and status elements
// RULES:        Every state keeps exactly one geographic surface visible.
// PROVENANCE:   Scope/steps/05a_recast_player.md

export function createMapSurfaceVisibility({ mapElement, fallbackElement, statusElement }) {
  return Object.freeze({
    showMap(message) {
      mapElement.hidden = false;
      fallbackElement.hidden = true;
      statusElement.textContent = message;
    },
    showFallback() {
      mapElement.hidden = true;
      fallbackElement.hidden = false;
      statusElement.textContent = "MazeMap unavailable · labelled route fallback active";
    },
  });
}
