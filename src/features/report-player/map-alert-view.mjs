// FEATURE:      Report Player on-map positioning warnings
// SURFACE:      renderAnalysisMapAlerts(analysis), renderPlayerMapAlerts(frame, context)
// WHY TOGETHER: Aggregate Report warnings and current Player warnings share one visible map overlay.
// STATE:        None
// RULES:        Analysis reports threshold totals; Player reports only the current playback moment.
// PROVENANCE:   Scope/steps/05b_improve_report.md

import { esc } from "../../shared/format.mjs";

export function renderAnalysisMapAlerts(analysis) {
  const stale = analysis?.warnings?.stalePosition;
  const floor = analysis?.warnings?.floorMismatch;
  return [
    stale?.active && banner({
      kind: "stale-position",
      text: [
        `No position update > ${formatThreshold(analysis?.thresholds?.stickySeconds)} s`,
        episodeLabel(stale.episodeCount),
        `worst ${formatWholeSeconds(stale.worstSeconds)}`,
      ].join(" · "),
    }),
    floor?.active && banner({
      kind: "floor-mismatch",
      text: [
        "Floor level disconnect",
        episodeLabel(floor.episodeCount),
        `worst ${formatWholeSeconds(floor.worstSeconds)}`,
      ].join(" · "),
    }),
  ].filter(Boolean).join("");
}

export function renderPlayerMapAlerts(frame, { thresholds, floors = [] } = {}) {
  const floorNames = new Map(floors.map(floor => [String(floor.z), floor.name]));
  const latestFixAgeSeconds = Number(frame?.latestFixAgeSeconds);
  const staleThreshold = Number(thresholds?.stickySeconds);
  const latestFixZ = frame?.latestFix?.z;
  const routeZ = frame?.walker?.z;
  return [
    Number.isFinite(latestFixAgeSeconds)
      && Number.isFinite(staleThreshold)
      && frame?.walker?.moving === true
      && latestFixAgeSeconds > staleThreshold
      && banner({
        kind: "stale-position",
        text: `No position update · ${formatWholeSeconds(latestFixAgeSeconds)}`,
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

function banner({ kind, text }) {
  return `<div class="map-alert-banner ${esc(kind)}"
    data-map-alert-kind="${esc(kind)}">${esc(text)}</div>`;
}

function floorName(names, z) {
  return names.get(String(z)) ?? `z ${z}`;
}

function episodeLabel(value) {
  const count = Number.isFinite(value) ? value : 0;
  return `${count} ${count === 1 ? "episode" : "episodes"}`;
}

function formatThreshold(value) {
  if (!Number.isFinite(value)) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatWholeSeconds(value) {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value)} s`;
}
