// FEATURE:      Stationary room evidence
// SURFACE:      buildRoomObservations(result, reviewedExceptions)
// WHY TOGETHER: Eligible stop/dwell windows and their displayed Cisco fixes share one clock rule.
// STATE:        None
// RULES:        Use Player raw-fix state only; never score walking, intermediates, or snap output.
// PROVENANCE:   All eligible survey stop/dwell evidence

import { checkpointDwellSeconds } from "./checkpoint-dwell-v3.mjs";
import {
  displayedCiscoFix,
  displayedCiscoFixSeries,
} from "./report-displayed-fix.mjs";
import { AREA_WINDOW_SECONDS } from "./report-area-verdict.mjs";
import { buildReportCoverage } from "./report-reviewed-exceptions.mjs";

export function buildRoomObservations(result, reviewedExceptions = []) {
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
    const dwellSeconds = checkpointDwellSeconds(
      checkpoint,
      result.run.checkpointDwellSeconds,
    );
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

function text(value) {
  const result = String(value ?? "").trim();
  return result || null;
}
