// FEATURE:      Report direction overlay
// SURFACE:      createReportRouteAxis(route, options), travelDirectionAt(truth, axis, atMs, windowMs)
// WHY TOGETHER: Folded corridor distance and travel direction share one spatial axis.
// STATE:        Route model captured by the returned lookup functions
// RULES:        A physical spot keeps its first-pass distance; ties resolve to the earliest pass.
// PROVENANCE:   NDH out-and-back corridor overlay contract

export function createReportRouteAxis(route, { toleranceM = 1.5 } = {}) {
  function canonicalAt(point) {
    const eligible = nearCandidates(route, point, toleranceM);
    if (!eligible.length) return null;
    return Math.min(...eligible.map(candidate => candidate.routeDistanceM));
  }

  function canonicalOfDistance(routeDistanceM) {
    if (!Number.isFinite(routeDistanceM)) return null;
    return canonicalAt(route.pointAt(routeDistanceM)) ?? routeDistanceM;
  }

  return Object.freeze({
    axisLengthM: route.totalDistanceM,
    canonicalAt,
    canonicalOfDistance,
  });
}

export function travelDirectionAt(truth, axis, atMs, windowMs = 3000) {
  const before = truth.at(Math.max(truth.startMs, atMs - windowMs));
  const after = truth.at(Math.min(truth.endMs, atMs + windowMs));
  const beforeM = before ? axis.canonicalAt(before) : null;
  const afterM = after ? axis.canonicalAt(after) : null;
  if (![beforeM, afterM].every(Number.isFinite)) return null;
  if (afterM - beforeM > 0.5) return "forward";
  if (beforeM - afterM > 0.5) return "reverse";
  return null;
}

function nearCandidates(route, point, toleranceM) {
  if (![point?.lng, point?.lat, point?.z].every(Number.isFinite)) return [];
  const candidates = route.legs
    .map(leg => route.project(point, { legIndex: leg.index, z: point.z }))
    .filter(candidate => Number.isFinite(candidate?.projectionDistanceM));
  if (!candidates.length) return [];
  const nearestM = Math.min(
    ...candidates.map(candidate => candidate.projectionDistanceM),
  );
  return candidates
    .filter(candidate => candidate.projectionDistanceM <= nearestM + toleranceM);
}
