// FEATURE:      Report direction overlay
// SURFACE:      publicDirectionBin(bin, options), directionOverlaySummary(bins)
// WHY TOGETHER: Bin publication and summary flags interpret the same accumulated evidence.
// STATE:        None
// RULES:        Mean of both directions cancels lag; flags need evidence in both directions.
// PROVENANCE:   NDH out-and-back corridor overlay contract

import { reportQuantile } from "./report-samples.mjs";

export function publicDirectionBin(bin, { binSizeM, errorThresholdM, lockSecondsMin }) {
  const forward = directionStats(bin.forward);
  const reverse = directionStats(bin.reverse);
  const medians = [forward.medianErrorM, reverse.medianErrorM]
    .filter(Number.isFinite);
  const bothMeasured = medians.length === 2;
  return {
    binStartM: round(bin.index * binSizeM),
    binDistanceM: round((bin.index + 0.5) * binSizeM),
    z: bin.z,
    byDirection: { forward, reverse },
    meanErrorM: medians.length
      ? round(medians.reduce((total, value) => total + value, 0) / medians.length)
      : null,
    deltaM: bothMeasured ? round(forward.medianErrorM - reverse.medianErrorM) : null,
    lockSeconds: round(
      forward.lockSeconds + reverse.lockSeconds + bin.undirectedLockSeconds,
    ),
    lockBothWays: forward.lockSeconds >= lockSecondsMin
      && reverse.lockSeconds >= lockSecondsMin,
    rfIssue: bothMeasured
      && forward.medianErrorM > errorThresholdM
      && reverse.medianErrorM > errorThresholdM,
  };
}

export function directionOverlaySummary(bins) {
  const oneWayLock = bin => !bin.lockBothWays
    && (bin.byDirection.forward.lockSeconds > 0)
      !== (bin.byDirection.reverse.lockSeconds > 0);
  return {
    binCount: bins.length,
    lockBothWaysBins: bins.filter(bin => bin.lockBothWays)
      .map(bin => bin.binDistanceM),
    rfIssueBins: bins.filter(bin => bin.rfIssue).map(bin => bin.binDistanceM),
    singleDirectionLockBins: bins.filter(oneWayLock).map(bin => bin.binDistanceM),
  };
}

function directionStats(direction) {
  return {
    n: direction.errors.length,
    medianErrorM: round(reportQuantile(direction.errors, 0.5)),
    lockSeconds: round(direction.lockSeconds),
  };
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
