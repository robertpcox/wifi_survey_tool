// FEATURE:      Room polygon evidence
// SURFACE:      roomContainsPoint(room, point)
// WHY TOGETHER: Floor-aware Polygon and MultiPolygon containment define room membership.
// STATE:        None
// RULES:        Test exact captured coordinates; treat outer boundaries as inside.
// PROVENANCE:   Dynamic dwell room-resolution evidence

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
