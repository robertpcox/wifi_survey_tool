import { routePreviewMarkup } from "./preview.mjs";

export function renderCreatorStops(find, stops, selectedIndex = -1) {
  find("[data-stop-list]").innerHTML = stops.map((stop, index) => `
    <li class="creator-stop${index === selectedIndex ? " selected" : ""}">
      <span><strong>${escapeText(stop.name)}</strong>
        <small>${stop.lng.toFixed(6)}, ${stop.lat.toFixed(6)}, z${stop.z}
          · ${escapeText(stop.provenance.method)}</small></span>
      <span>
        <button type="button" data-action="move-stop-up" data-index="${index}"
          aria-label="Move stop ${index + 1} up"${index === 0 ? " disabled" : ""}>Move up</button>
        <button type="button" data-action="move-stop-down" data-index="${index}"
          aria-label="Move stop ${index + 1} down"${index === stops.length - 1
            ? " disabled" : ""}>Move down</button>
        <button type="button" data-action="remove-stop" data-index="${index}">Remove</button>
      </span>
    </li>
  `).join("");
}

export function renderCreatorRoute(find, stops, route) {
  find("[data-route-preview]").innerHTML = routePreviewMarkup(
    stops,
    route.legs,
    route.checkpoints,
  );
  const values = {
    distance: `${route.distanceM.toFixed(1)} m`,
    checkpoints: String(route.checkpoints.length),
    walking: formatSeconds(route.duration.walkingSeconds),
    dwell: formatSeconds(route.duration.dwellSeconds),
    total: formatSeconds(route.duration.totalSeconds),
  };
  for (const [name, value] of Object.entries(values)) {
    find(`[data-metric="${name}"]`).textContent = value;
  }
}

export function renderCreatorCoverage(find, coverage) {
  const buildings = coverage?.buildings ?? [];
  const levels = coverage?.zLevels ?? [];
  find("[data-coverage-buildings]").textContent = buildings.length
    ? `Buildings: ${buildings.map(item => item.name).join(", ")}`
    : "No mapped buildings yet.";
  find("[data-coverage-floors]").textContent = levels.length
    ? `Floors: ${levels.map(z => coverage.zLevelNames[z]).join(", ")}`
    : "No mapped floors yet.";
}

function formatSeconds(value) {
  const seconds = Number(value);
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} min ${(seconds % 60).toFixed(0)} s`;
}

function escapeText(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
