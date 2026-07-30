// FEATURE:      Report Player snap tester
// SURFACE:      snapFixToActiveRoute(rawFix, walker, radiusM)
// WHY TOGETHER: Same-floor interval projection and acceptance form one tester result.
// STATE:        None
// RULES:        Never mutate or replace the raw fix; candidates stay visualization-only.
// PROVENANCE:   Scope/steps/05a_recast_player.md snap tester contract

import { haversine } from "./geometry.mjs";
import { projectToReportRoute } from "./report-route-geometry.mjs";

export function snapFixToActiveRoute(rawFix, walker, radiusM) {
  checkedFix(rawFix);
  if (!Number.isFinite(radiusM) || radiusM < 0) {
    throw new TypeError("radiusM must be a non-negative finite number");
  }
  const interval = walker?.routeInterval;
  const candidate = intervalCandidate(rawFix, walker, interval);
  const measuredDistanceM = candidate
    ? haversine(rawFix, candidate)
    : null;
  const accepted = Number.isFinite(measuredDistanceM)
    && measuredDistanceM <= radiusM;
  return {
    rawFix,
    radiusM,
    measuredDistanceM,
    accepted,
    status: accepted ? "accepted" : "rejected",
    reason: candidate
      ? (accepted ? "within-radius" : "outside-radius")
      : "no-same-floor-active-route",
    candidate,
  };
}

function intervalCandidate(rawFix, walker, interval) {
  if (!interval || !Array.isArray(interval.segments)) return null;
  if (!interval.segments.length) {
    return walker?.z === rawFix.z
      ? candidatePoint(walker, walker.routeDistanceM)
      : null;
  }
  const segments = interval.segments.map(item => ({
    legId: item.legId,
    legIndex: item.legIndex,
    startDistanceM: item.startDistanceM,
    endDistanceM: item.endDistanceM,
    lengthM: item.endDistanceM - item.startDistanceM,
    from: item.from,
    to: item.to,
  }));
  const minimum = Math.min(interval.startDistanceM, interval.endDistanceM);
  const maximum = Math.max(interval.startDistanceM, interval.endDistanceM);
  const projected = projectToReportRoute(segments, maximum, rawFix, {
    minDistanceM: minimum,
    maxDistanceM: maximum,
    z: rawFix.z,
  });
  return projected ? candidatePoint(projected, projected.routeDistanceM) : null;
}

function candidatePoint(point, routeDistanceM) {
  return {
    lng: point.lng,
    lat: point.lat,
    z: point.z,
    routeDistanceM,
    cumulativeDistanceM: routeDistanceM,
    activeLegId: point.activeLegId,
    activeLegIndex: point.activeLegIndex,
  };
}

function checkedFix(rawFix) {
  if (![rawFix?.lng, rawFix?.lat, rawFix?.z].every(Number.isFinite)) {
    throw new TypeError("rawFix: lng, lat, and z must be finite");
  }
}
