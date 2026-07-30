// FEATURE:      Direction-up map camera bearing
// SURFACE:      bearingTo(origin, target)
// WHY TOGETHER: One geographic calculation converts two map points into a camera bearing.
// STATE:        None
// RULES:        Invalid or coincident points fall back to geographic north.
// PROVENANCE:   Runner direction-up field feedback

export function bearingTo(origin, target) {
  if (![origin?.lng, origin?.lat, target?.lng, target?.lat].every(Number.isFinite)) {
    return 0;
  }
  if (origin.lng === target.lng && origin.lat === target.lat) return 0;
  const radians = value => value * Math.PI / 180;
  const fromLat = radians(origin.lat);
  const toLat = radians(target.lat);
  const longitudeDelta = radians(target.lng - origin.lng);
  const y = Math.sin(longitudeDelta) * Math.cos(toLat);
  const x = Math.cos(fromLat) * Math.sin(toLat)
    - Math.sin(fromLat) * Math.cos(toLat) * Math.cos(longitudeDelta);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
