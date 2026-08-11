// FEATURE:      MazeMap floor-outline common areas
// SURFACE:      normalizeMazeMapFloorAreas(floors, buildingIds)
// WHY TOGETHER: Provider floor metadata and geometry form one local corridor-truth value.
// STATE:        None
// RULES:        Include selected buildings only; floor areas never identify a named room.
// PROVENANCE:   Consolidated long-corridor area resolution

export function normalizeMazeMapFloorAreas(floors, buildingIds = []) {
  const selected = new Set(buildingIds.map(text).filter(Boolean));
  return catalogItems(floors, "floors").flatMap(item => {
    const area = normalizeFloorArea(item);
    if (!area) return [];
    if (selected.size && (!area.buildingId || !selected.has(area.buildingId))) return [];
    return [area];
  });
}

function normalizeFloorArea(item) {
  const data = item?.properties ?? item ?? {};
  const geometry = polygonGeometry(item?.geometry ?? data.geometry);
  const z = numeric(data.z ?? data.zLevel ?? item?.z ?? item?.zLevel);
  if (!geometry || z == null) return null;
  const floorId = text(data.id ?? data.floorId ?? item?.id);
  const buildingId = text(
    data.buildingId ?? data.building?.id ?? item?.buildingId,
  );
  const campusId = text(data.campusId ?? data.campus?.id ?? item?.campusId);
  const floorName = text(data.name ?? data.floorName ?? data.zName ?? item?.name);
  const owner = buildingId ?? campusId ?? "unknown";
  const identity = floorId ?? `${owner}:z:${z}`;
  return Object.freeze({
    id: `floor:${identity}:common`,
    identifier: floorId,
    name: floorName ? `${floorName} common area` : `Level ${z} common area`,
    z,
    geometry,
    areaKind: "common-area",
    floorId,
    buildingId,
    campusId,
  });
}

function catalogItems(value, key) {
  return Array.isArray(value) ? value : value?.features ?? value?.[key] ?? [];
}

function polygonGeometry(value) {
  return ["Polygon", "MultiPolygon"].includes(value?.type)
    ? structuredClone(value) : null;
}

function text(value) {
  const result = String(value ?? "").trim();
  return result || null;
}

function numeric(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
