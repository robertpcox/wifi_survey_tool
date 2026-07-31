// FEATURE:      Report Player on-map positioning warnings
// SURFACE:      renderAnalysisMapAlerts(), renderPlayerMapAlerts(frame, context), renderConcernDetail(properties)
// WHY TOGETHER: The shared map owns one alert slot for Player warnings and tapped concern detail.
// STATE:        None
// RULES:        Report shows banners only for tapped concern segments; Player owns live warnings.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import { haversine } from "../../domain/geometry.mjs";
import { esc } from "../../shared/format.mjs";

const CONCERN_LABELS = Object.freeze({
  centre: "Dead centre · locks from both directions",
  "approach-forward": "Approach · walking out",
  "approach-reverse": "Approach · walking back",
  "rf-suspect": "RF suspect · error both ways",
});

export function renderAnalysisMapAlerts() {
  return "";
}

export function renderConcernDetail(properties = {}) {
  if (Number.isFinite(Number(properties.runCount))) {
    return chip(`${properties.runCount} run(s) · ${formatWholeSeconds(
      Number(properties.lockSeconds),
    )} locked · median ${formatMetres(Number(properties.medianErrorM))}`);
  }
  const label = CONCERN_LABELS[properties.kind];
  if (!label) return "";
  const span = [properties.binStartM, properties.binEndM]
    .map(value => (Number.isFinite(Number(value)) ? Math.round(value) : "?"));
  return chip(`${label} · ${span[0]}–${span[1]} m · out ${formatWholeSeconds(
    Number(properties.forwardLockSeconds),
  )} / back ${formatWholeSeconds(Number(properties.reverseLockSeconds))} locked`);
}

function chip(text) {
  return `<div class="map-concern-chip"
    data-map-alert-kind="concern-detail">${esc(text)}</div>`;
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
