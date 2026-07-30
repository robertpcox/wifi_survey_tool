// FEATURE:      Report direction overlay
// SURFACE:      buildDirectionOverlay(result, analysis, options)
// WHY TOGETHER: Per-bin error by walking direction and lock heat separate RF faults from latency.
// STATE:        None
// RULES:        Same spot bad both ways flags RF; hottest heat is lock time in both directions.
// PROVENANCE:   NDH out-and-back corridor overlay contract

import {
  directionOverlaySummary,
  publicDirectionBin,
} from "./report-direction-bins.mjs";
import { buildGroundTruthModel } from "./report-ground-truth.mjs";
import {
  createReportRouteAxis,
  travelDirectionAt,
} from "./report-route-axis.mjs";

const EPSILON = 1e-6;

export function buildDirectionOverlay(result, analysis, options = {}) {
  const {
    binSizeM = 5,
    errorThresholdM = analysis.thresholds.accuracyM,
    lockSecondsMin = 3,
    directionWindowMs = 3000,
  } = options;
  const truth = buildGroundTruthModel(result);
  const axis = createReportRouteAxis(truth.route);
  const bins = new Map();
  for (const sample of analysis.fixes.samples) {
    if (!sample.groundTruth || !Number.isFinite(sample.accuracyM)) continue;
    const canonicalM = axis.canonicalAt(sample.groundTruth);
    if (!Number.isFinite(canonicalM)) continue;
    const direction = travelDirectionAt(
      truth,
      axis,
      Date.parse(sample.fixTime),
      directionWindowMs,
    );
    if (!direction) continue;
    binFor(bins, binSizeM, canonicalM, sample.groundTruth.z)[direction]
      .errors.push(sample.accuracyM);
  }
  for (const piece of analysis.stalePathSegments ?? []) {
    assignLock(bins, binSizeM, axis, piece);
  }
  const publicBins = [...bins.values()]
    .sort((left, right) => left.index - right.index)
    .map(bin => publicDirectionBin(bin, { binSizeM, errorThresholdM, lockSecondsMin }));
  return {
    binSizeM,
    errorThresholdM,
    lockSecondsMin,
    axisLengthM: round(axis.axisLengthM),
    bins: publicBins,
    summary: directionOverlaySummary(publicBins),
  };
}

function binFor(bins, binSizeM, canonicalM, z) {
  const index = Math.max(0, Math.floor(canonicalM / binSizeM));
  const existing = bins.get(index);
  if (existing) {
    existing.z ??= z ?? null;
    return existing;
  }
  const bin = {
    index,
    z: z ?? null,
    forward: { errors: [], lockSeconds: 0 },
    reverse: { errors: [], lockSeconds: 0 },
    undirectedLockSeconds: 0,
  };
  bins.set(index, bin);
  return bin;
}

function assignLock(bins, binSizeM, axis, piece) {
  const startM = axis.canonicalOfDistance(piece.startDistanceM);
  const endM = axis.canonicalOfDistance(piece.endDistanceM);
  if (![startM, endM].every(Number.isFinite)) return;
  const direction = endM - startM > EPSILON
    ? "forward"
    : (startM - endM > EPSILON ? "reverse" : null);
  const low = Math.min(startM, endM);
  const high = Math.max(startM, endM);
  const span = high - low;
  const firstIndex = Math.max(0, Math.floor(low / binSizeM));
  const lastIndex = Math.max(firstIndex, Math.ceil(high / binSizeM) - 1);
  for (let index = firstIndex; index <= lastIndex; index++) {
    const overlap = span > EPSILON
      ? Math.min(high, (index + 1) * binSizeM) - Math.max(low, index * binSizeM)
      : span + 1;
    if (!(overlap > 0)) continue;
    const seconds = span > EPSILON
      ? piece.durationSeconds * overlap / span
      : piece.durationSeconds;
    const bin = binFor(bins, binSizeM, index * binSizeM, piece.z);
    if (direction) bin[direction].lockSeconds += seconds;
    else bin.undirectedLockSeconds += seconds;
  }
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
