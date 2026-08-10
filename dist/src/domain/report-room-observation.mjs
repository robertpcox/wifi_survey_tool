// FEATURE:      Dynamic stationary room evidence
// SURFACE:      buildDynamicRoomObservations(result, reviewedExceptions)
// WHY TOGETHER: Eligible stop/dwell windows and their displayed Cisco fixes share one clock rule.
// STATE:        None
// RULES:        Use Player raw-fix state only; never score walking, intermediates, or snap output.
// PROVENANCE:   Dynamic dwell room-resolution evidence

import {
  displayedCiscoFix,
  displayedCiscoFixSeries,
} from "./report-displayed-fix.mjs";
import { AREA_WINDOW_SECONDS } from "./report-area-verdict.mjs";
import { buildReportCoverage } from "./report-reviewed-exceptions.mjs";

export function buildDynamicRoomObservations(result, reviewedExceptions = []) {
  if (result?.run?.captureMode !== "dynamic-room") return [];
  const stops = new Map(result.route.stops.map(stop => [stop.id, stop]));
  const checkIns = new Map(result.checkIns.map(item => [item.checkpointId, item]));
  const orderedCheckIns = result.checkIns
    .map(item => Date.parse(item.at))
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  const stoppedAtMs = Date.parse(result.run.stoppedAt);
  const coverage = buildReportCoverage(result, reviewedExceptions);
  return result.route.checkpoints.flatMap(checkpoint => {
    if (checkpoint.type !== "stop" || !checkpoint.stopId) return [];
    const checkIn = checkIns.get(checkpoint.id);
    const stop = stops.get(checkpoint.stopId);
    if (!checkIn || !stop) return [];
    const startMs = Date.parse(checkIn.at);
    if (!Number.isFinite(startMs) || coverage.excludes(startMs)) return [];
    const dwellSeconds = nonNegative(checkpoint.dwellSeconds);
    const nextCheckInMs = orderedCheckIns.find(value => value > startMs);
    const plannedEndMs = startMs + dwellSeconds * 1000;
    const endMs = dwellSeconds > 0
      ? Math.max(startMs, Math.min(plannedEndMs, nextCheckInMs ?? Infinity, stoppedAtMs))
      : startMs;
    const windowEndMs = Math.min(endMs, startMs + AREA_WINDOW_SECONDS * 1000);
    const moments = windowEndMs === startMs
      ? [displayedCiscoFix(result, startMs)]
      : displayedCiscoFixSeries(result, startMs, windowEndMs);
    const entry = moments[0];
    const exit = moments.at(-1);
    const windowSeconds = (windowEndMs - startMs) / 1000;
    return [Object.freeze({
      resultId: result.run.resultId,
      surveyId: result.run.surveyId,
      checkpointId: checkpoint.id,
      stopId: stop.id,
      roomLabel: stop.poiName ?? stop.name,
      expectedPoiId: text(stop.poiId),
      target: { ...checkIn.groundTruth },
      checkedInAt: checkIn.at,
      startMs,
      endMs,
      dwellSeconds: (endMs - startMs) / 1000,
      windowEndMs,
      windowSeconds,
      windowComplete: windowSeconds === AREA_WINDOW_SECONDS,
      observationKind: dwellSeconds > 0 ? "dwell" : "check-in",
      moments,
      entry,
      exit,
      device: structuredClone(result.run.device),
    })];
  });
}

function nonNegative(value) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) && number > 0 ? number : 0;
}

function text(value) {
  const result = String(value ?? "").trim();
  return result || null;
}
