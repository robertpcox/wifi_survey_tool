// FEATURE:      Shared map GeoJSON construction
// SURFACE:      geoPoint(), geoPath(), geoCircle(), validMapPoint()
// WHY TOGETHER: Exact point, floor-split path, and metre-circle geometry share validation.
// STATE:        None
// RULES:        Coordinates remain [lng, lat]; never project to canvas-normalized geometry.
// PROVENANCE:   Scope/steps/05a_recast_player.md geographic-truth contract

export function validMapPoint(value) {
  return Number.isFinite(Number(value?.lng))
    && Number.isFinite(Number(value?.lat))
    && Number.isFinite(Number(value?.z));
}

export function geoPoint(point, properties = {}, id) {
  if (!validMapPoint(point)) return null;
  return {
    type: "Feature",
    ...(id == null ? {} : { id }),
    properties: { ...properties, z: Number(point.z) },
    geometry: {
      type: "Point",
      coordinates: [Number(point.lng), Number(point.lat)],
    },
  };
}

export function geoPath(points, properties = {}, idPrefix) {
  const valid = (Array.isArray(points) ? points : []).filter(validMapPoint);
  if (valid.length < 2) return [];
  const features = [];
  let floor = Number(valid[0].z);
  let coordinates = [[Number(valid[0].lng), Number(valid[0].lat)]];
  const append = (extraProperties = {}) => {
    if (coordinates.length < 2) return;
    features.push({
      type: "Feature",
      ...(idPrefix == null ? {} : { id: `${idPrefix}:${features.length}` }),
      properties: { ...properties, ...extraProperties, z: floor },
      geometry: { type: "LineString", coordinates },
    });
  };
  for (const point of valid.slice(1)) {
    const coordinate = [Number(point.lng), Number(point.lat)];
    const pointFloor = Number(point.z);
    if (pointFloor !== floor) {
      const previous = coordinates.at(-1);
      append();
      coordinates = [previous, coordinate];
      append({ toZ: pointFloor });
      floor = pointFloor;
      coordinates = [coordinate];
    } else {
      coordinates.push(coordinate);
    }
  }
  append();
  return features;
}

export function geoCircle(point, radiusM, properties = {}, id) {
  if (!validMapPoint(point) || !(Number(radiusM) > 0)) return null;
  const lat = Number(point.lat);
  const lng = Number(point.lng);
  const radius = Number(radiusM);
  const lngM = 111320 * Math.cos(lat * Math.PI / 180);
  const latM = 110540;
  const ring = Array.from({ length: 33 }, (_unused, index) => {
    const angle = index / 32 * Math.PI * 2;
    return [
      lng + Math.cos(angle) * radius / lngM,
      lat + Math.sin(angle) * radius / latM,
    ];
  });
  return {
    type: "Feature",
    ...(id == null ? {} : { id }),
    properties: { ...properties, z: Number(point.z), radiusM: radius },
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}
