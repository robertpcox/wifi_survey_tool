// FEATURE:      Report Player no-position-update path
// SURFACE:      reportStalePathPieces(options)
// WHY TOGETHER: Threshold timing and exact route slicing define one walked-path artifact.
// STATE:        None
// RULES:        Only threshold-exceeded moving truth is emitted; route geometry is never bridged.
// PROVENANCE:   NDH field-report "where it gets stuck" visualization

const EPSILON = 1e-9;

export function reportStalePathPieces({
  sample,
  truthSegment,
  truth,
  thresholdSeconds,
}) {
  if (!truthSegment?.moving) return [];
  const staleStartMs = sample.heldSinceMs + thresholdSeconds * 1000;
  const startedMs = Math.max(truthSegment.startMs, staleStartMs);
  const endedMs = truthSegment.endMs;
  if (!(endedMs > startedMs)) return [];

  const start = truth.at(startedMs);
  const end = truth.at(endedMs);
  if (![start?.routeDistanceM, end?.routeDistanceM].every(Number.isFinite)) {
    return [];
  }
  const distanceSpan = end.routeDistanceM - start.routeDistanceM;
  if (Math.abs(distanceSpan) <= EPSILON) return [];

  return truth.routeInterval(
    start.routeDistanceM,
    end.routeDistanceM,
  ).segments.flatMap(routeSlice => {
    if (!(Math.abs(
      routeSlice.endDistanceM - routeSlice.startDistanceM,
    ) > EPSILON)) return [];
    const pieceStartedMs = timeAtDistance(
      startedMs,
      endedMs,
      start.routeDistanceM,
      distanceSpan,
      routeSlice.startDistanceM,
    );
    const pieceEndedMs = timeAtDistance(
      startedMs,
      endedMs,
      start.routeDistanceM,
      distanceSpan,
      routeSlice.endDistanceM,
    );
    return [{
      z: routeSlice.z,
      coordinates: routeSlice.coordinates.map(coordinate => [...coordinate]),
      startedAt: new Date(pieceStartedMs).toISOString(),
      endedAt: new Date(pieceEndedMs).toISOString(),
      durationSeconds: round(Math.abs(pieceEndedMs - pieceStartedMs) / 1000),
      startDistanceM: round(routeSlice.startDistanceM),
      endDistanceM: round(routeSlice.endDistanceM),
      pollId: sample.pollId,
      fixAgeStartSeconds: round((pieceStartedMs - sample.heldSinceMs) / 1000),
      fixAgeEndSeconds: round((pieceEndedMs - sample.heldSinceMs) / 1000),
      legId: routeSlice.legId,
      legIndex: routeSlice.legIndex,
    }];
  });
}

function timeAtDistance(
  startedMs,
  endedMs,
  startDistanceM,
  distanceSpan,
  distanceM,
) {
  const fraction = (distanceM - startDistanceM) / distanceSpan;
  return startedMs + (endedMs - startedMs) * Math.min(Math.max(fraction, 0), 1);
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
