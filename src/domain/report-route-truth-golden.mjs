// FEATURE:      Report Player route truth
// SURFACE:      summarizeRouteTruthAnalysis(result)
// WHY TOGETHER: Field-golden counts and duration metrics require one stable summary shape.
// STATE:        None
// RULES:        Use default report thresholds and count heat evidence without publishing input.
// PROVENANCE:   Scope/steps/05a_recast_player.md before/after golden acceptance

import { analyzeReportResult } from "./report-analysis.mjs";

export function summarizeRouteTruthAnalysis(result) {
  const analysis = analyzeReportResult(result);
  const { metrics } = analysis;
  return {
    thresholds: analysis.thresholds,
    sampleCount: metrics.sampleCount,
    measuredSeconds: metrics.measuredSeconds,
    movingSeconds: metrics.movingSeconds,
    sticky: {
      pointCount: pointCount(analysis.heatmaps.sticky),
      seconds: metrics.stickySeconds,
      percent: metrics.stickyPercent,
    },
    accuracy: {
      pointCount: pointCount(analysis.heatmaps.accuracy),
      seconds: metrics.outsideAccuracySeconds,
      percent: metrics.outsideAccuracyPercent,
    },
    medianAccuracyM: metrics.medianAccuracyM,
    p95AccuracyM: metrics.p95AccuracyM,
    medianRttMs: metrics.medianRttMs,
  };
}

function pointCount(floors) {
  return floors.reduce((total, floor) => total + floor.points.length, 0);
}
