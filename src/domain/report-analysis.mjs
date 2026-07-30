// FEATURE:      Report Player analysis
// SURFACE:      analyzeReportResult(result, thresholds), REPORT_THRESHOLDS
// WHY TOGETHER: Metrics and elapsed threshold heat derive from one normalized timeline.
// STATE:        None
// RULES:        Failure is strictly beyond threshold; heat is elapsed time at ground truth.
// PROVENANCE:   Step 5 report analysis contract

import { buildReportGroundTruth } from "./report-ground-truth.mjs";
import {
  buildReportTimeline,
  publicReportSample,
  reportAccuracyAt,
  reportQuantile,
  reportTruthOverlaps,
} from "./report-samples.mjs";
import { buildReportWarnings } from "./report-warnings.mjs";
export const REPORT_THRESHOLDS = Object.freeze({
  stickySeconds: 5,
  accuracyM: 10,
});

export function analyzeReportResult(result, selected = REPORT_THRESHOLDS) {
  const thresholds = {
    stickySeconds: threshold(selected.stickySeconds, "stickySeconds"),
    accuracyM: threshold(selected.accuracyM, "accuracyM"),
  };
  const floors = (result?.meta?.zLevels ?? []).map(z => {
    const name = result.meta.zLevelNames?.[String(z)];
    if (typeof name !== "string" || !name.trim()) {
      throw new TypeError(`meta.zLevelNames.${z}: must name every configured floor`);
    }
    return { z, name };
  });
  if (!floors.length) throw new TypeError("meta.zLevels: must contain a floor");
  const truth = buildReportGroundTruth(result);
  const timeline = buildReportTimeline(result, truth, thresholds);
  const stoppedAtMs = Date.parse(result.run.stoppedAt);
  const sticky = floorBuckets(floors);
  const accuracy = floorBuckets(floors);
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
        addHeat(accuracy, groundTruth, elapsed, {
          pollId: sample.pollId,
          distanceM: interval.distanceM,
        });
      }
      if (!segment.moving) continue;
      movingSeconds += elapsed;
      const stickyStartMs = sample.heldSinceMs + thresholds.stickySeconds * 1000;
      const startMs = Math.max(segment.startMs, stickyStartMs);
      if (startMs >= segment.endMs) continue;
      const stickyTruth = truth.at((startMs + segment.endMs) / 2);
      addHeat(sticky, stickyTruth, (segment.endMs - startMs) / 1000, {
        pollId: sample.pollId,
        fixAgeSeconds: (segment.endMs - sample.heldSinceMs) / 1000,
      });
    }
  }
  const stickySeconds = heatWeight(sticky);
  const outsideAccuracySeconds = heatWeight(accuracy);
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
    timeline: timeline.map(publicReportSample),
    heatmaps: {
      sticky: [...sticky.values()],
      accuracy: [...accuracy.values()],
    },
  };
}

function floorBuckets(floors) {
  return new Map(floors.map(floor => [
    String(floor.z),
    { ...floor, points: [] },
  ]));
}

function addHeat(buckets, groundTruth, weightSeconds, details) {
  const floor = buckets.get(String(groundTruth?.z));
  if (!floor || !(weightSeconds > 0)) return;
  floor.points.push({
    at: groundTruth.at,
    lat: groundTruth.lat,
    lng: groundTruth.lng,
    z: groundTruth.z,
    weightSeconds: round(weightSeconds),
    ...details,
  });
}

function heatWeight(buckets) {
  return [...buckets.values()].flatMap(floor => floor.points)
    .reduce((total, point) => total + point.weightSeconds, 0);
}

function percent(part, whole) {
  return whole > 0 ? round(part / whole * 100) : 0;
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}

function threshold(value, name) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${name}: must be a non-negative finite number`);
  }
  return value;
}
