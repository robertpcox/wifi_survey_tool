// FEATURE:      Report Player route truth
// SURFACE:      buildReportRoute(route)
// WHY TOGETHER: Route flattening, bounded projection, and interval slicing share one distance axis.
// STATE:        Immutable cumulative geometry captured by the returned route model
// RULES:        Preserve authored lng/lat/z and never bridge separate legs with invented chords.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic truth contract

import { haversine } from "./geometry.mjs";
import {
  projectToReportRoute,
  reportRouteInterval,
  reportRoutePointAt,
} from "./report-route-geometry.mjs";

export function buildReportRoute(route) {
  const legs = [];
  const segments = [];
  let cumulativeDistanceM = 0;
  for (const [legIndex, leg] of (route?.legs ?? []).entries()) {
    const geometry = routeGeometry(leg, legIndex);
    const startDistanceM = cumulativeDistanceM;
    for (let index = 1; index < geometry.length; index++) {
      const from = geometry[index - 1];
      const to = geometry[index];
      const lengthM = haversine(from, to);
      segments.push({
        legId: leg.id,
        legIndex,
        segmentIndex: index - 1,
        startDistanceM: cumulativeDistanceM,
        endDistanceM: cumulativeDistanceM + lengthM,
        lengthM,
        from,
        to,
      });
      cumulativeDistanceM += lengthM;
    }
    legs.push({
      id: leg.id,
      index: legIndex,
      fromStopId: leg.fromStopId,
      toStopId: leg.toStopId,
      startDistanceM,
      endDistanceM: cumulativeDistanceM,
      geometry,
    });
  }
  if (!segments.length) {
    throw new TypeError("route.legs: must contain embedded leg geometry");
  }
  return Object.freeze({
    totalDistanceM: cumulativeDistanceM,
    legs,
    segments,
    pointAt(distanceM) {
      return reportRoutePointAt(segments, cumulativeDistanceM, distanceM);
    },
    project(point, options = {}) {
      return projectToReportRoute(
        segments,
        cumulativeDistanceM,
        point,
        options,
      );
    },
    interval(startDistanceM, endDistanceM) {
      return reportRouteInterval(
        segments,
        cumulativeDistanceM,
        startDistanceM,
        endDistanceM,
      );
    },
  });
}

function routeGeometry(leg, legIndex) {
  if (!Array.isArray(leg?.geometry) || leg.geometry.length < 2) {
    throw new TypeError(`route.legs.${legIndex}.geometry: must contain at least 2 points`);
  }
  return leg.geometry.map((point, pointIndex) => {
    const value = { lng: point?.lng, lat: point?.lat, z: point?.z };
    if (!Object.values(value).every(Number.isFinite)) {
      throw new TypeError(
        `route.legs.${legIndex}.geometry.${pointIndex}: lng, lat, and z must be finite`,
      );
    }
    return value;
  });
}
