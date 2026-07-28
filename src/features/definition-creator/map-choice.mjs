export function showCreatorMapChoice(find, { clicked, context } = {}) {
  const panel = find("[data-map-choice]");
  const poi = context?.poi ?? {};
  const poiCenter = poi.center ?? null;
  find("[data-clicked-summary]").textContent =
    `Clicked point: ${coordinateSummary(clicked)}`;
  find("[data-poi-summary]").textContent = poiCenter
    ? `POI centre${poi.name ? ` — ${poi.name}` : ""}: ${coordinateSummary(poiCenter)}`
    : "No POI centre is available at this point.";
  const poiAction = find("[data-map-choice-poi-action]");
  poiAction.disabled = !poiCenter || !poi.id;
  panel.hidden = false;
}

export function closeCreatorMapChoice(find) {
  find("[data-map-choice]").hidden = true;
}

export function coordinateSummary(point) {
  const lng = Number(point?.lng);
  const lat = Number(point?.lat);
  const z = Number(point?.z);
  if (![lng, lat, z].every(Number.isFinite)) return "coordinates unavailable";
  return `${lng.toFixed(6)}, ${lat.toFixed(6)}, z${z}`;
}
