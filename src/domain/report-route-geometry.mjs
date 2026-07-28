// FEATURE:      Report Player route truth
// SURFACE:      reportRoutePointAt, projectToReportRoute, reportRouteInterval
// WHY TOGETHER: Distance lookup, bounded projection, and slicing use identical segment math.
// STATE:        None
// RULES:        Projection respects route bounds, optional leg/floor, and deterministic ties.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic truth contract
import { haversine } from "./geometry.mjs";
const EPSILON = 1e-9;
export function reportRoutePointAt(segments, totalDistanceM, requestedDistanceM) {
  const distanceM = clampDistance(requestedDistanceM, totalDistanceM);
  const segment = distanceM >= totalDistanceM
    ? segments.at(-1)
    : segments.find(item => (
      item.lengthM > EPSILON
      && distanceM >= item.startDistanceM
      && distanceM < item.endDistanceM
    )) ?? segments.find(item => item.endDistanceM >= distanceM) ?? segments.at(-1);
  const fraction = segment.lengthM > EPSILON
    ? (distanceM - segment.startDistanceM) / segment.lengthM
    : (distanceM >= segment.endDistanceM ? 1 : 0);
  return publicPoint(segment, fraction, distanceM);
}
export function projectToReportRoute(segments, totalDistanceM, point, options) {
  const target = checkedPoint(point);
  const minimum = clampDistance(options.minDistanceM ?? 0, totalDistanceM);
  const maximum = clampDistance(options.maxDistanceM ?? totalDistanceM, totalDistanceM);
  const allowedLeg = Number.isInteger(options.legIndex) ? options.legIndex : null;
  const floor = Number.isFinite(options.z) ? options.z : null;
  let best = null;
  for (const segment of segments) {
    if (allowedLeg !== null && segment.legIndex !== allowedLeg) continue;
    const bounds = fractionBounds(segment, minimum, maximum, floor);
    if (!bounds) continue;
    const fraction = clamp(projectedFraction(target, segment), ...bounds);
    const routeDistanceM = segment.startDistanceM + segment.lengthM * fraction;
    const candidate = publicPoint(segment, fraction, routeDistanceM);
    const projectionDistanceM = haversine(target, candidate);
    if (betterProjection(best, projectionDistanceM, routeDistanceM)) {
      best = { ...candidate, projectionDistanceM };
    }
  }
  return best;
}
export function reportRouteInterval(segments, totalDistanceM, startValue, endValue) {
  const startDistanceM = clampDistance(startValue, totalDistanceM);
  const endDistanceM = clampDistance(endValue, totalDistanceM);
  const minimum = Math.min(startDistanceM, endDistanceM);
  const maximum = Math.max(startDistanceM, endDistanceM);
  const sliced = segments.flatMap(segment => (
    sliceSegment(segment, minimum, maximum)
  ));
  return {
    startDistanceM,
    endDistanceM,
    start: reportRoutePointAt(segments, totalDistanceM, startDistanceM),
    end: reportRoutePointAt(segments, totalDistanceM, endDistanceM),
    segments: startDistanceM <= endDistanceM ? sliced : sliced.reverse(),
  };
}
function fractionBounds(segment, minimum, maximum, floor) {
  if (segment.endDistanceM < minimum || segment.startDistanceM > maximum) {
    return null;
  }
  const low = segment.lengthM > EPSILON
    ? clamp((minimum - segment.startDistanceM) / segment.lengthM, 0, 1)
    : 0;
  const high = segment.lengthM > EPSILON
    ? clamp((maximum - segment.startDistanceM) / segment.lengthM, 0, 1)
    : 1;
  if (floor === null || (segment.from.z === floor && segment.to.z === floor)) {
    return [low, high];
  }
  if (segment.from.z === floor && low === 0) return [0, 0];
  if (segment.to.z === floor && high === 1) return [1, 1];
  return null;
}
function sliceSegment(segment, minimum, maximum) {
  if (segment.lengthM <= EPSILON) {
    const transition = segment.startDistanceM >= minimum
      && segment.startDistanceM < maximum
      && segment.from.z !== segment.to.z;
    if (!transition) return [];
    return publicSlice(
      segment,
      publicPoint(segment, 0, segment.startDistanceM),
      publicPoint(segment, 1, segment.endDistanceM),
    );
  }
  if (segment.endDistanceM <= minimum
    || segment.startDistanceM >= maximum) return [];
  const start = Math.max(minimum, segment.startDistanceM);
  const end = Math.min(maximum, segment.endDistanceM);
  const fromFraction = (start - segment.startDistanceM) / segment.lengthM;
  const toFraction = (end - segment.startDistanceM) / segment.lengthM;
  const from = publicPoint(segment, fromFraction, start);
  const to = publicPoint(segment, toFraction, end);
  return publicSlice(segment, from, to);
}
function publicSlice(segment, from, to) {
  return [{
    legId: segment.legId,
    legIndex: segment.legIndex,
    z: from.z,
    startDistanceM: from.routeDistanceM,
    endDistanceM: to.routeDistanceM,
    from,
    to,
    coordinates: [[from.lng, from.lat], [to.lng, to.lat]],
  }];
}
function publicPoint(segment, fraction, routeDistanceM) {
  const bounded = clamp(fraction, 0, 1);
  return {
    lng: segment.from.lng + (segment.to.lng - segment.from.lng) * bounded,
    lat: segment.from.lat + (segment.to.lat - segment.from.lat) * bounded,
    z: bounded >= 1 ? segment.to.z : segment.from.z,
    routeDistanceM,
    cumulativeDistanceM: routeDistanceM,
    activeLegId: segment.legId,
    activeLegIndex: segment.legIndex,
  };
}
function projectedFraction(point, segment) {
  const radians = Math.PI / 180;
  const longitudeScale = 6_371_000 * Math.cos(point.lat * radians) * radians;
  const latitudeScale = 6_371_000 * radians;
  const ax = (segment.from.lng - point.lng) * longitudeScale;
  const ay = (segment.from.lat - point.lat) * latitudeScale;
  const dx = (segment.to.lng - segment.from.lng) * longitudeScale;
  const dy = (segment.to.lat - segment.from.lat) * latitudeScale;
  const lengthSquared = dx * dx + dy * dy;
  return lengthSquared > 0 ? -(ax * dx + ay * dy) / lengthSquared : 0;
}
function betterProjection(current, projectionDistanceM, routeDistanceM) {
  return !current
    || projectionDistanceM < current.projectionDistanceM - EPSILON
    || (Math.abs(projectionDistanceM - current.projectionDistanceM) <= EPSILON
      && routeDistanceM < current.routeDistanceM);
}
function checkedPoint(point) {
  if (![point?.lng, point?.lat, point?.z].every(Number.isFinite)) throw new TypeError("point: lng, lat, and z must be finite");
  return point;
}
function clampDistance(value, maximum) {
  if (!Number.isFinite(value)) throw new TypeError("route distance must be finite");
  return clamp(value, 0, maximum);
}
function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
