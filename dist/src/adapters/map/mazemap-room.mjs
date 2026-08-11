// FEATURE:      MazeMap room resolution
// SURFACE:      normalizeMazeMapRoom(poi, requestedZ)
// WHY TOGETHER: Provider POI identity and polygon extraction form one room lookup value.
// STATE:        None
// RULES:        Preserve GeoJSON geometry; never replace the requested test coordinate.
// PROVENANCE:   Dynamic dwell room-resolution evidence

export function normalizeMazeMapRoom(poi, requestedZ) {
  if (!poi || typeof poi !== "object") return null;
  const properties = poi.properties ?? {};
  const id = text(properties.poiId ?? properties.id ?? poi.id);
  const identifier = text(
    properties.identifier ?? properties.roomNumber ?? properties.number,
  );
  const name = text(
    properties.title ?? properties.name ?? properties.names?.[0] ?? poi.name,
  );
  const geometry = roomGeometry(poi.geometry ?? properties.geometry);
  const z = numeric(properties.zLevel ?? properties.z ?? requestedZ);
  if (!id && !name && !geometry) return null;
  return Object.freeze({ id, identifier, name, z, geometry });
}

export function mergeMazeMapRooms(primary, fallback) {
  if (!primary) return fallback ?? null;
  if (!fallback) return primary;
  return Object.freeze({
    id: primary.id ?? fallback.id,
    identifier: primary.identifier ?? fallback.identifier,
    name: primary.name ?? fallback.name,
    z: primary.z ?? fallback.z,
    geometry: primary.geometry ?? fallback.geometry,
  });
}

function roomGeometry(value) {
  if (!["Polygon", "MultiPolygon"].includes(value?.type)) return null;
  return structuredClone(value);
}

function text(value) {
  const result = String(value ?? "").trim();
  return result || null;
}

function numeric(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
