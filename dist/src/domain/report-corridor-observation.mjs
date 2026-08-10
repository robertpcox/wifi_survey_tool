// FEATURE:      Dynamic corridor area evidence
// SURFACE:      buildDynamicCorridorObservations(result, reviewedExceptions)
// WHY TOGETHER: Intermediate walking checkpoints form repeated corridor containment samples.
// STATE:        None
// RULES:        Use exact checkpoint truth and displayed raw Cisco fix; never snap to the route.
// PROVENANCE:   Long-corridor MazeMap area-resolution evidence

import { displayedCiscoFix } from "./report-displayed-fix.mjs";
import { buildGroundTruthModel } from "./report-ground-truth.mjs";
import { buildReportCoverage } from "./report-reviewed-exceptions.mjs";
import { createReportRouteAxis, travelDirectionAt }
  from "./report-route-axis.mjs";

export function buildDynamicCorridorObservations(result, reviewedExceptions = []) {
  if (result?.run?.captureMode !== "dynamic-room") return [];
  const checkIns = new Map(result.checkIns.map(item => [item.checkpointId, item]));
  const truth = buildGroundTruthModel(result);
  const coverage = buildReportCoverage(result, reviewedExceptions, truth);
  const axis = createReportRouteAxis(truth.route);
  return result.route.checkpoints.flatMap(checkpoint => {
    if (checkpoint.type !== "intermediate") return [];
    const checkIn = checkIns.get(checkpoint.id);
    const atMs = Date.parse(checkIn?.at);
    if (!checkIn || !Number.isFinite(atMs) || coverage.excludes(atMs)) return [];
    const fix = displayedCiscoFix(result, atMs);
    return [Object.freeze({
      resultId: result.run.resultId,
      surveyId: result.run.surveyId,
      checkpointId: checkpoint.id,
      stopId: null,
      roomLabel: "Corridor",
      expectedPoiId: null,
      target: { ...checkIn.groundTruth },
      checkedInAt: checkIn.at,
      startMs: atMs,
      endMs: atMs,
      dwellSeconds: 0,
      observationKind: "corridor-point",
      direction: travelDirectionAt(truth, axis, atMs),
      entry: fix,
      exit: fix,
      device: structuredClone(result.run.device),
    })];
  });
}
