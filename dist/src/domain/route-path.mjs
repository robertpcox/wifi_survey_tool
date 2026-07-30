import { haversine } from "./geometry.mjs";

export function extractPath(geojson, from, to) {
  const segments = extractSegments(geojson);
  if (!segments.length) return [];
  const points = joinNearestSegments(segments, from);
  orientPath(points, from, to);
  fillMissingFloors(points, from);
  addExactEndpoint(points, from, true);
  addExactEndpoint(points, to, false);
  return points.filter((point, index) =>
    index === 0 || !sameRoutePoint(points[index - 1], point));
}

function extractSegments(geojson) {
  const segments = [];
  for (const feature of geojson?.features || []) {
    const geometry = feature.geometry;
    if (!geometry) continue;
    const rawZ = feature.properties?.z
      ?? feature.properties?.zLevel
      ?? feature.properties?.zlevel;
    const z = Number.isFinite(Number(rawZ)) ? Number(rawZ) : null;
    const lines = geometry.type === "LineString"
      ? [geometry.coordinates]
      : (geometry.type === "MultiLineString" ? geometry.coordinates : []);
    for (const coordinates of lines) {
      const segment = [];
      for (const coordinate of coordinates) {
        const point = { lng: Number(coordinate[0]), lat: Number(coordinate[1]), z };
        if (!Number.isFinite(point.lng) || !Number.isFinite(point.lat)) continue;
        const last = segment[segment.length - 1];
        if (!last || !sameRoutePoint(last, point)) segment.push(point);
      }
      if (segment.length >= 2) segments.push(segment);
    }
  }
  return segments;
}

function joinNearestSegments(segments, from) {
  const remaining = segments.map(segment => segment.slice());
  const points = [];
  let cursor = routePoint(from);
  while (remaining.length) {
    const nearest = nearestSegment(remaining, cursor);
    const segment = remaining.splice(nearest.index, 1)[0];
    if (nearest.reverse) segment.reverse();
    if (points.length && sameRoutePoint(points.at(-1), segment[0])) segment.shift();
    points.push(...segment);
    cursor = points.at(-1);
  }
  return points;
}

function nearestSegment(segments, cursor) {
  let result = { index: 0, reverse: false, distance: Infinity };
  segments.forEach((segment, index) => {
    const startDistance = routePointDistance(cursor, segment[0]);
    const endDistance = routePointDistance(cursor, segment.at(-1));
    if (startDistance < result.distance) {
      result = { index, reverse: false, distance: startDistance };
    }
    if (endDistance < result.distance) {
      result = { index, reverse: true, distance: endDistance };
    }
  });
  return result;
}

function orientPath(points, from, to) {
  const first = points[0];
  const last = points.at(-1);
  const forwardDistance = routePointDistance(from, first)
    + routePointDistance(to, last);
  const reverseDistance = routePointDistance(from, last)
    + routePointDistance(to, first);
  if (reverseDistance < forwardDistance) points.reverse();
}

function fillMissingFloors(points, from) {
  let lastZ = Number(from.z);
  if (!Number.isFinite(lastZ)) {
    lastZ = points.find(point => point.z != null)?.z ?? 1;
  }
  for (const point of points) {
    if (point.z == null) point.z = lastZ;
    else lastZ = point.z;
  }
}

function addExactEndpoint(points, endpoint, atStart) {
  const exact = routePoint(endpoint);
  const index = atStart ? 0 : points.length - 1;
  if (sameRoutePoint(points[index], exact)) points[index] = exact;
  else if (atStart) points.unshift(exact);
  else points.push(exact);
}

export function routePoint(value) {
  return {
    lng: Number(value.lng),
    lat: Number(value.lat),
    z: Number(value.z),
  };
}

export function sameRoutePoint(a, b) {
  return a.lng === b.lng && a.lat === b.lat && Number(a.z) === Number(b.z);
}

export function routePointDistance(a, b) {
  const knownDifferentFloor = Number.isFinite(Number(a.z))
    && Number.isFinite(Number(b.z))
    && Number(a.z) !== Number(b.z);
  return haversine(a, b) + (knownDifferentFloor ? 1000 : 0);
}
