export function showCreatorMapChoice(find, { clicked, context } = {}) {
  const panel = find("[data-map-choice]");
  const poi = context?.poi ?? {};
  const poiCenter = poi.center ?? null;
  const hasPoi = Boolean(String(poi.id ?? "").trim())
    && [poiCenter?.lng, poiCenter?.lat, poiCenter?.z]
      .every(value => Number.isFinite(Number(value)));
  find("[data-clicked-summary]").textContent =
    `Clicked point: ${coordinateSummary(clicked)}`;
  const summary = find("[data-poi-summary]");
  summary.hidden = !hasPoi;
  summary.textContent = hasPoi
    ? `POI centre${poi.name ? ` — ${poi.name}` : ""}: ${coordinateSummary(poiCenter)}`
    : "";
  const poiAction = find("[data-map-choice-poi-action]");
  poiAction.disabled = !hasPoi;
  poiAction.hidden = !hasPoi;
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
