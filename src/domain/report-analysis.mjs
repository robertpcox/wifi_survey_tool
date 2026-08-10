// FEATURE:      Report Player analysis
// SURFACE:      analyzeReportResult(result, thresholds), REPORT_THRESHOLDS
// WHY TOGETHER: Metrics and elapsed threshold heat derive from one normalized timeline.
// STATE:        None
// RULES:        Failure is strictly beyond threshold; heat is elapsed time at ground truth.
// PROVENANCE:   Step 5 report analysis contract
import { buildFixLanes } from "./report-fix-metrics.mjs";
import { reportAnalysisOptions } from "./report-analysis-options.mjs";
import { buildUniqueFixSamples, publicFixSample } from "./report-fix-samples.mjs";
import { buildReportGroundTruth } from "./report-ground-truth.mjs";
import { addHeatPoint, floorHeatBuckets, totalHeatSeconds } from "./report-heat.mjs";
import {
  applyReportCoverage,
  buildReportCoverage,
} from "./report-reviewed-exceptions.mjs";
import {
  buildReportTimeline,
  publicReportSample,
  reportAccuracyAt,
  reportQuantile,
  reportTruthOverlaps,
} from "./report-samples.mjs";
import { reportStalePathPieces } from "./report-stale-path.mjs";
import { buildReportWarnings } from "./report-warnings.mjs";
export const REPORT_THRESHOLDS = Object.freeze({
  stickySeconds: 15,
  accuracyM: 10,
  noPositionSeconds: 30,
});
export function analyzeReportResult(
  result,
  selected = REPORT_THRESHOLDS,
  reviewedExceptions = [],
) {
  const { floors, thresholds } = reportAnalysisOptions(
    result,
    selected,
    REPORT_THRESHOLDS,
  );
  const playbackTruth = buildReportGroundTruth(result);
  const coverage = buildReportCoverage(result, reviewedExceptions, playbackTruth);
  const truth = applyReportCoverage(playbackTruth, coverage);
  const timeline = buildReportTimeline(result, truth, thresholds);
  const stoppedAtMs = Date.parse(result.run.stoppedAt);
  const sticky = floorHeatBuckets(floors);
  const accuracy = floorHeatBuckets(floors);
  const stalePathSegments = [];
  let movingSeconds = 0;
  let measuredSeconds = 0;
  for (let index = 0; index < timeline.length; index++) {
    const sample = timeline[index];
    const endMs = timeline[index + 1]?.receivedMs ?? stoppedAtMs;
    for (const segment of reportTruthOverlaps(
      truth.segments,
      sample.receivedMs,
      endMs,
    )) {
      const elapsed = (segment.endMs - segment.startMs) / 1000;
      const middleMs = (segment.startMs + segment.endMs) / 2;
      const interval = reportAccuracyAt(sample, truth, middleMs);
      const groundTruth = interval.groundTruth;
      measuredSeconds += elapsed;
      if (interval.distanceM > thresholds.accuracyM) {
        addHeatPoint(accuracy, groundTruth, elapsed, {
          pollId: sample.pollId,
          distanceM: interval.distanceM,
        });
      }
      if (!segment.moving) continue;
      movingSeconds += elapsed;
      stalePathSegments.push(...reportStalePathPieces({
        sample,
        truthSegment: segment,
        truth,
        thresholdSeconds: thresholds.stickySeconds,
      }));
      const stickyStartMs = sample.heldSinceMs + thresholds.stickySeconds * 1000;
      const startMs = Math.max(segment.startMs, stickyStartMs);
      if (startMs >= segment.endMs) continue;
      const stickyTruth = truth.at((startMs + segment.endMs) / 2);
      addHeatPoint(sticky, stickyTruth, (segment.endMs - startMs) / 1000, {
        pollId: sample.pollId,
        fixAgeSeconds: (segment.endMs - sample.heldSinceMs) / 1000,
        routeDistanceM: stickyTruth?.routeDistanceM,
        activeLegId: stickyTruth?.activeLegId,
      });
    }
  }
  const stickySeconds = totalHeatSeconds(sticky);
  const outsideAccuracySeconds = totalHeatSeconds(accuracy);
  const fixSamples = buildUniqueFixSamples(result, truth);
  const lanes = buildFixLanes({
    result,
    samples: fixSamples,
    thresholds,
    movingSeconds,
    stickySeconds,
    timeline,
    truth,
    coverage,
  });
  const warnings = buildReportWarnings({
    timeline,
    truth,
    stoppedAtMs,
    thresholds,
    measuredSeconds,
    movingSeconds,
  });
  const errors = timeline.map(item => item.accuracyM).filter(Number.isFinite);
  const rtts = timeline.map(item => item.roundTripMs).filter(Number.isFinite);
  return {
    thresholds,
    reviewedExceptions: coverage.reviewedExceptions,
    coverage: {
      eligibleSeconds: coverage.eligibleSeconds,
      excludedSeconds: coverage.excludedSeconds,
    },
    floors,
    metrics: {
      sampleCount: timeline.length,
      measuredSeconds: round(measuredSeconds),
      movingSeconds: round(movingSeconds),
      stickySeconds: round(stickySeconds),
      stickyPercent: percent(stickySeconds, movingSeconds),
      outsideAccuracySeconds: round(outsideAccuracySeconds),
      outsideAccuracyPercent: percent(outsideAccuracySeconds, measuredSeconds),
      floorMismatchSeconds: warnings.floorMismatch.affectedSeconds,
      floorMismatchPercent: warnings.floorMismatch.affectedPercent,
      medianAccuracyM: round(reportQuantile(errors, 0.5)),
      p95AccuracyM: round(reportQuantile(errors, 0.95)),
      medianRttMs: round(reportQuantile(rtts, 0.5)),
    },
    warnings,
    stalePathSegments,
    timeline: timeline.map(publicReportSample),
    fixes: { samples: fixSamples.map(publicFixSample), ...lanes },
    heatmaps: {
      sticky: [...sticky.values()],
      accuracy: [...accuracy.values()],
    },
  };
}
function percent(part, whole) {
  return whole > 0 ? round(part / whole * 100) : 0;
}
function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
