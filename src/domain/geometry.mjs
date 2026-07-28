export function haversine(a, b) {
  const radiusM = 6371000;
  const toRadians = value => value * Math.PI / 180;
  const latitudeDelta = toRadians(b.lat - a.lat);
  const longitudeDelta = toRadians(b.lng - a.lng);
  const haversineValue = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(toRadians(a.lat))
      * Math.cos(toRadians(b.lat))
      * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * radiusM * Math.asin(Math.sqrt(haversineValue));
}

export function bearing(a, b) {
  const toRadians = value => value * Math.PI / 180;
  const longitudeDelta = toRadians(b.lng - a.lng);
  const y = Math.sin(longitudeDelta) * Math.cos(toRadians(b.lat));
  const x = Math.cos(toRadians(a.lat)) * Math.sin(toRadians(b.lat))
    - Math.sin(toRadians(a.lat))
      * Math.cos(toRadians(b.lat))
      * Math.cos(longitudeDelta);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

export function lerp(a, b, fraction) {
  return {
    lng: a.lng + (b.lng - a.lng) * fraction,
    lat: a.lat + (b.lat - a.lat) * fraction,
    z: a.z,
  };
}

export function pathLength(points) {
  let distanceM = 0;
  for (let index = 1; index < points.length; index++) {
    distanceM += haversine(points[index - 1], points[index]);
  }
  return distanceM;
}
