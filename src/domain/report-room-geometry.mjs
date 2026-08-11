// FEATURE:      Room polygon evidence
// SURFACE:      roomContainsPoint(room, point), distanceOutsideRoomM(room, point)
// WHY TOGETHER: Floor-aware containment and boundary distance share the same room geometry.
// STATE:        None
// RULES:        Test exact captured coordinates; treat outer boundaries as inside.
// PROVENANCE:   Dynamic dwell room-resolution evidence

import { haversine } from "./geometry.mjs";

const EARTH_RADIUS_M = 6_371_000;
const RADIANS = Math.PI / 180;

export function roomContainsPoint(room, point) {
  if (!room || !finitePoint(point)) return false;
  if (Number.isFinite(room.z) && Number(room.z) !== Number(point.z)) return false;
  const geometry = room.geometry;
  if (geometry?.type === "Polygon") {
    return polygonContains(geometry.coordinates, point);
  }
  if (geometry?.type === "MultiPolygon") {
    return geometry.coordinates.some(polygon => polygonContains(polygon, point));
  }
  return false;
}

export function distanceOutsideRoomM(room, point) {
  if (!room || !finitePoint(point)) return null;
  if (Number.isFinite(room.z) && Number(room.z) !== Number(point.z)) return null;
  const polygons = geometryPolygons(room.geometry);
  if (!polygons) return null;
  if (roomContainsPoint(room, point)) return 0;
  let closestM = Infinity;
  for (const polygon of polygons) {
    if (!Array.isArray(polygon)) continue;
    for (const ring of polygon) {
      closestM = Math.min(closestM, ringDistanceM(ring, point));
    }
  }
  return Number.isFinite(closestM) ? closestM : null;
}

function geometryPolygons(geometry) {
  if (geometry?.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    return [geometry.coordinates];
  }
  if (geometry?.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates;
  }
  return null;
}

function ringDistanceM(ring, point) {
  if (!Array.isArray(ring) || ring.length < 2) return Infinity;
  let closestM = Infinity;
  for (let index = 0; index < ring.length; index++) {
    const left = coordinate(ring[index]);
    const right = coordinate(ring[(index + 1) % ring.length]);
    if (!left || !right) continue;
    closestM = Math.min(closestM, segmentDistanceM(left, right, point));
  }
  return closestM;
}

function segmentDistanceM(left, right, point) {
  const longitudeScale = EARTH_RADIUS_M * Math.cos(point.lat * RADIANS) * RADIANS;
  const latitudeScale = EARTH_RADIUS_M * RADIANS;
  const ax = (left.lng - point.lng) * longitudeScale;
  const ay = (left.lat - point.lat) * latitudeScale;
  const dx = (right.lng - left.lng) * longitudeScale;
  const dy = (right.lat - left.lat) * latitudeScale;
  const lengthSquared = dx * dx + dy * dy;
  const fraction = lengthSquared > 0
    ? Math.min(1, Math.max(0, -(ax * dx + ay * dy) / lengthSquared)) : 0;
  return haversine(point, {
    lng: left.lng + (right.lng - left.lng) * fraction,
    lat: left.lat + (right.lat - left.lat) * fraction,
  });
}

function polygonContains(rings, point) {
  if (!Array.isArray(rings) || !ringContains(rings[0], point)) return false;
  return !rings.slice(1).some(ring => ringContains(ring, point));
}

function ringContains(ring, point) {
  if (!Array.isArray(ring) || ring.length < 3) return false;
  let inside = false;
  for (let index = 0, prior = ring.length - 1; index < ring.length; prior = index++) {
    const left = coordinate(ring[prior]);
    const right = coordinate(ring[index]);
    if (!left || !right) continue;
    if (onSegment(point, left, right)) return true;
    const crosses = (right.lat > point.lat) !== (left.lat > point.lat)
      && point.lng < (left.lng - right.lng) * (point.lat - right.lat)
        / (left.lat - right.lat) + right.lng;
    if (crosses) inside = !inside;
  }
  return inside;
}

function onSegment(point, left, right) {
  const cross = (point.lat - left.lat) * (right.lng - left.lng)
    - (point.lng - left.lng) * (right.lat - left.lat);
  if (Math.abs(cross) > 1e-12) return false;
  return point.lng >= Math.min(left.lng, right.lng) - 1e-12
    && point.lng <= Math.max(left.lng, right.lng) + 1e-12
    && point.lat >= Math.min(left.lat, right.lat) - 1e-12
    && point.lat <= Math.max(left.lat, right.lat) + 1e-12;
}

function coordinate(value) {
  const lng = Number(value?.[0]);
  const lat = Number(value?.[1]);
  return Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : null;
}

function finitePoint(value) {
  return [value?.lng, value?.lat, value?.z].every(Number.isFinite);
}
