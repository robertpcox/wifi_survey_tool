// FEATURE:      Report corridor concern overlay
// SURFACE:      buildConcernSegments(result, analysis, options)
// WHY TOGETHER: Direction-lock extents and their dead-centre intersection form one map feed.
// STATE:        None
// RULES:        Approaches carry one direction each; the centre is where both directions lock.
// PROVENANCE:   NDH areas-of-concern map surface · left/centre/right corridor reading

import { buildDirectionOverlay } from "./report-direction-overlay.mjs";
import { buildGroundTruthModel } from "./report-ground-truth.mjs";

const EPSILON = 1e-6;
const DIRECTIONS = Object.freeze({
  centre: "both",
  "approach-forward": "forward",
  "approach-reverse": "reverse",
  "rf-suspect": "both",
});

export function buildConcernSegments(result, analysis, options = {}) {
  const { approachLockSeconds = 1, ...overlayOptions } = options;
  const overlay = buildDirectionOverlay(result, analysis, overlayOptions);
  const truth = buildGroundTruthModel(result);
  const segments = [];
  for (const bin of overlay.bins) {
    for (const kind of binKinds(bin, approachLockSeconds)) {
      segments.push(...binSlices(truth, overlay, bin, kind));
    }
  }
  return segments;
}

function binKinds(bin, approachMin) {
  const forward = bin.byDirection.forward.lockSeconds;
  const reverse = bin.byDirection.reverse.lockSeconds;
  const kinds = [];
  if (bin.lockBothWays) {
    kinds.push("centre");
  } else if (forward >= approachMin && forward >= reverse) {
    kinds.push("approach-forward");
  } else if (reverse >= approachMin) {
    kinds.push("approach-reverse");
  }
  if (bin.rfIssue && !kinds.includes("centre")) kinds.push("rf-suspect");
  return kinds;
}

function binSlices(truth, overlay, bin, kind) {
  const startM = Math.min(bin.binStartM, truth.totalRouteDistanceM);
  const endM = Math.min(
    bin.binStartM + overlay.binSizeM,
    truth.totalRouteDistanceM,
  );
  return truth.routeInterval(startM, endM).segments.flatMap(slice => {
    if (!(Math.abs(slice.endDistanceM - slice.startDistanceM) > EPSILON)) {
      return [];
    }
    return [{
      kind,
      direction: DIRECTIONS[kind],
      pairId: `concern:${kind}:${bin.binStartM}`,
      z: slice.z,
      coordinates: slice.coordinates.map(coordinate => [...coordinate]),
      binStartM: bin.binStartM,
      binEndM: round(endM),
      binDistanceM: bin.binDistanceM,
      forwardLockSeconds: bin.byDirection.forward.lockSeconds,
      reverseLockSeconds: bin.byDirection.reverse.lockSeconds,
      lockSeconds: bin.lockSeconds,
      meanErrorM: bin.meanErrorM,
      deltaM: bin.deltaM,
      rfIssue: bin.rfIssue,
    }];
  });
}

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : null;
}
