export function poiCenter(poi, z) {
  const direct = coordinate(poi?.lng, poi?.lat, z);
  if (direct) return direct;
  const point = arrayCoordinate(poi?.point?.coordinates, z);
  if (point) return point;
  if (poi?.geometry?.type === "Point") {
    return arrayCoordinate(poi.geometry.coordinates, z);
  }
  if (poi?.geometry?.type !== "Polygon") return null;
  const coordinates = poi.geometry.coordinates?.[0]
    ?.map(value => arrayCoordinate(value, z))
    .filter(Boolean) ?? [];
  if (!coordinates.length) return null;
  return {
    lng: average(coordinates, "lng"),
    lat: average(coordinates, "lat"),
    z: Number(z),
  };
}

function arrayCoordinate(value, z) {
  if (!Array.isArray(value)) return null;
  return coordinate(value[0], value[1], z);
}

function coordinate(lngValue, latValue, zValue) {
  const lng = Number(lngValue);
  const lat = Number(latValue);
  const z = Number(zValue);
  if (![lng, lat, z].every(Number.isFinite)) return null;
  if (Math.abs(lng) > 180 || Math.abs(lat) > 90) return null;
  return { lng, lat, z };
}

function average(coordinates, key) {
  return coordinates.reduce((sum, value) => sum + value[key], 0)
    / coordinates.length;
}
