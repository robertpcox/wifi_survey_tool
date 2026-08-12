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
  const identifier = firstText(
    properties.identifier, properties.roomNumber, properties.number,
  );
  const names = Array.isArray(properties.names) ? properties.names : [properties.names];
  const name = firstText(
    properties.title, properties.name, ...names, poi.name,
  );
  const geometry = roomGeometry(poi.geometry ?? properties.geometry);
  const z = numeric(properties.zLevel ?? properties.z ?? requestedZ);
  if (!id && !name && !geometry) return null;
  const kind = providerKind(properties.kind ?? poi.kind);
  return Object.freeze({
    id, identifier, name, z, geometry,
    kind,
    areaKind: kind === "zone" ? "zone" : "room",
  });
}

export function mergeMazeMapRooms(primary, fallback) {
  if (!primary) return fallback ?? null;
  if (!fallback) return primary;
  const kind = primary.kind ?? fallback.kind ?? null;
  return Object.freeze({
    id: primary.id ?? fallback.id,
    identifier: primary.identifier ?? fallback.identifier,
    name: primary.name ?? fallback.name,
    z: primary.z ?? fallback.z,
    geometry: primary.geometry ?? fallback.geometry,
    kind,
    areaKind: kind === "zone"
      ? "zone" : (primary.areaKind ?? fallback.areaKind ?? "room"),
  });
}

function providerKind(value) {
  const kind = String(value ?? "").trim().toLowerCase();
  return kind || null;
}

function roomGeometry(value) {
  if (!["Polygon", "MultiPolygon"].includes(value?.type)) return null;
  return structuredClone(value);
}

function text(value) {
  const result = String(value ?? "").trim();
  return result || null;
}

function firstText(...values) {
  return values.map(text).find(Boolean) ?? null;
}

function numeric(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
