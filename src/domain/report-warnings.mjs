// FEATURE:      Report warning analysis
// SURFACE:      buildReportWarnings(options)
// WHY TOGETHER: Stale-position and wrong-floor episodes share elapsed-time evidence semantics.
// STATE:        None
// RULES:        Weight inferred truth intervals, preserve captured fixes, and break deterministic ties.
// PROVENANCE:   Scope/contracts/report_analysis.md observed positioning behavior

import {
  reportAccuracyAt,
  reportTruthOverlaps,
} from "./report-samples.mjs";
import {
  publicWarningPoint,
  summarizeFloorPairs,
  summarizeWarning,
} from "./report-warning-summary.mjs";

export function buildReportWarnings({
  timeline,
  truth,
  stoppedAtMs,
  thresholds,
  measuredSeconds,
  movingSeconds,
}) {
  const stalePoints = [];
  const floorPoints = [];
  timeline.forEach((sample, index) => {
    const endMs = timeline[index + 1]?.receivedMs ?? stoppedAtMs;
    for (const segment of reportTruthOverlaps(
      truth.segments,
      sample.receivedMs,
      endMs,
    )) {
      const middleMs = Math.round((segment.startMs + segment.endMs) / 2);
      const groundTruth = reportAccuracyAt(sample, truth, middleMs).groundTruth;
      if (groundTruth && sample.fix.z !== groundTruth.z) {
        floorPoints.push(evidencePoint({
          sample,
          groundTruth,
          startMs: segment.startMs,
          endMs: segment.endMs,
          reportedFix: sample.fix,
        }));
      }
      if (!segment.moving) continue;
      const staleStartMs = Math.max(
        segment.startMs,
        sample.heldSinceMs + thresholds.stickySeconds * 1000,
      );
      if (staleStartMs >= segment.endMs) continue;
      stalePoints.push(evidencePoint({
        sample,
        groundTruth: truth.at(Math.round((staleStartMs + segment.endMs) / 2)),
        startMs: staleStartMs,
        endMs: segment.endMs,
      }));
    }
  });
  const stalePosition = summarizeWarning(
    "stale-position",
    stalePoints,
    movingSeconds,
  );
  const floorMismatch = summarizeWarning(
    "floor-mismatch",
    floorPoints,
    measuredSeconds,
  );
  return {
    stalePosition: {
      ...stalePosition,
      thresholdSeconds: thresholds.stickySeconds,
    },
    floorMismatch: {
      ...floorMismatch,
      points: floorPoints.map(publicWarningPoint),
      floorPairs: summarizeFloorPairs(floorPoints),
    },
  };
}

function evidencePoint({
  sample,
  groundTruth,
  startMs,
  endMs,
  reportedFix,
}) {
  const atMs = Math.round((startMs + endMs) / 2);
  const point = {
    startMs,
    endMs,
    atMs,
    at: new Date(atMs).toISOString(),
    lng: groundTruth.lng,
    lat: groundTruth.lat,
    z: groundTruth.z,
    pollId: sample.pollId,
    weightSeconds: (endMs - startMs) / 1000,
  };
  if (reportedFix) {
    point.reportedLng = reportedFix.lng;
    point.reportedLat = reportedFix.lat;
    point.reportedZ = reportedFix.z;
  }
  return point;
}
