// FEATURE:      Report Player on-map positioning warnings
// SURFACE:      renderAnalysisMapAlerts(), renderPlayerMapAlerts(frame, context)
// WHY TOGETHER: The shared map owns one alert slot, but only Player writes live warnings into it.
// STATE:        None
// RULES:        Report never shows banners; Player reports only the current playback moment.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import { haversine } from "../../domain/geometry.mjs";
import { esc } from "../../shared/format.mjs";

export function renderAnalysisMapAlerts() {
  return "";
}

export function renderPlayerMapAlerts(frame, {
  thresholds,
  floors = [],
  highlightKind = "sticky",
} = {}) {
  const floorNames = new Map(floors.map(floor => [String(floor.z), floor.name]));
  const latestFixAgeSeconds = Number(frame?.latestFixAgeSeconds);
  const staleThreshold = Number(thresholds?.stickySeconds);
  const positionErrorM = Number.isFinite(frame?.currentPositionErrorM)
    ? frame.currentPositionErrorM
    : currentPositionErrorM(frame);
  const accuracyThreshold = Number(thresholds?.accuracyM);
  const latestFixZ = frame?.latestFix?.z;
  const routeZ = frame?.walker?.z;
  return [
    highlightKind === "sticky"
      && Number.isFinite(latestFixAgeSeconds)
      && Number.isFinite(staleThreshold)
      && frame?.walker?.moving === true
      && latestFixAgeSeconds > staleThreshold
      && banner({
        kind: "stale-position",
        text: `No position update · ${formatWholeSeconds(latestFixAgeSeconds)}`,
      }),
    highlightKind === "accuracy"
      && Number.isFinite(positionErrorM)
      && Number.isFinite(accuracyThreshold)
      && positionErrorM > accuracyThreshold
      && banner({
        kind: "position-error",
        text: `Distance off route · ${formatMetres(positionErrorM)}`,
      }),
    latestFixZ != null
      && routeZ != null
      && String(latestFixZ) !== String(routeZ)
      && banner({
        kind: "floor-mismatch",
        text: `Wrong floor · shows ${floorName(floorNames, latestFixZ)} — on ${floorName(floorNames, routeZ)}`,
      }),
  ].filter(Boolean).join("");
}

function currentPositionErrorM(frame) {
  const fix = frame?.latestFix;
  const truth = frame?.walker;
  if (
    Number.isFinite(fix?.lng)
    && Number.isFinite(fix?.lat)
    && Number.isFinite(truth?.lng)
    && Number.isFinite(truth?.lat)
  ) {
    return haversine(fix, truth);
  }
  return null;
}

function banner({ kind, text }) {
  return `<div class="map-alert-banner ${esc(kind)}"
    data-map-alert-kind="${esc(kind)}">${esc(text)}</div>`;
}

function floorName(names, z) {
  return names.get(String(z)) ?? `z ${z}`;
}

function formatMetres(value) {
  if (!Number.isFinite(value)) return "—";
  const rounded = value >= 10 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} m`;
}

function formatWholeSeconds(value) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)} s`;
}
