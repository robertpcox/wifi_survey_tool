import { errorMessage } from "./mazemap-runtime.mjs";
import { poiCenter } from "./mazemap-poi-position.mjs";

const DEFAULT_CENTER = [170.508292, -45.872428];

export async function fetchCampusCatalog(Mazemap, campusId, fallback) {
  const data = Mazemap.Data ?? {};
  let campus = null;
  if (typeof data.getCampus === "function") {
    try {
      campus = await data.getCampus(campusId);
    } catch (error) {
      throw new Error(
        `Unable to load MazeMap campus ${campusId}: ${errorMessage(error)}`,
      );
    }
  }
  const [floors, buildings] = await Promise.all([
    optionalCatalog(data.getFloorsByCampusId, data, campusId),
    optionalCatalog(data.getBuildingsByCampusId, data, campusId),
  ]);
  return {
    buildings,
    floors,
    name: campus?.properties?.name ?? campus?.name ?? null,
    center: centerFromCampus(campus, fallback ?? DEFAULT_CENTER),
  };
}

export function describePoi(poi, requestedZ, catalogs = {}) {
  const properties = poi?.properties ?? {};
  const buildings = normalizeCatalog(catalogs.buildings, "buildings");
  const floors = normalizeCatalog(catalogs.floors, "floors");
  const rawBuildingId = properties.buildingId ?? properties.building?.id;
  const rawBuildingName = properties.buildingName ?? properties.building?.name;
  const buildingMatch = findCatalog(buildings, rawBuildingId, rawBuildingName);
  const buildingId = text(rawBuildingId ?? catalogId(buildingMatch));
  const buildingName = text(rawBuildingName ?? catalogName(buildingMatch));
  if (!buildingId || !buildingName) {
    throw new Error(
      "No building metadata was found at this point; click inside a mapped building.",
    );
  }
  const rawFloorId = properties.floorId ?? properties.floor?.id;
  const z = numeric(properties.zLevel ?? properties.z ?? requestedZ);
  const floorMatch = findFloor(floors, rawFloorId, z, buildingId);
  const floorName = text(
    properties.floorName ?? properties.zName
      ?? properties.floor?.name ?? catalogName(floorMatch),
  );
  if (z === null || !floorName) {
    throw new Error(
      "No floor metadata was found at this point; choose a mapped floor and click again.",
    );
  }
  return {
    building: { id: buildingId, name: buildingName },
    floor: { id: text(rawFloorId ?? catalogId(floorMatch)) || null, z, name: floorName },
    poi: {
      id: text(properties.poiId ?? poi?.id) || null,
      name: text(properties.title ?? properties.name ?? properties.names?.[0]) || null,
      center: poiCenter(poi, z),
    },
  };
}

function centerFromCampus(campus, fallback) {
  const bounds = [Infinity, Infinity, -Infinity, -Infinity];
  visitCoordinates(campus?.geometry?.coordinates, bounds);
  if (bounds.every(Number.isFinite)) {
    return [(bounds[0] + bounds[2]) / 2, (bounds[1] + bounds[3]) / 2];
  }
  return [...fallback];
}

async function optionalCatalog(method, owner, campusId) {
  if (typeof method !== "function") return [];
  try {
    return await method.call(owner, campusId);
  } catch {
    return [];
  }
}

function visitCoordinates(value, bounds) {
  if (!Array.isArray(value)) return;
  if (value.length >= 2 && Number.isFinite(+value[0]) && Number.isFinite(+value[1])) {
    const [lng, lat] = value.map(Number);
    if (Math.abs(lng) <= 180 && Math.abs(lat) <= 90) {
      bounds[0] = Math.min(bounds[0], lng);
      bounds[1] = Math.min(bounds[1], lat);
      bounds[2] = Math.max(bounds[2], lng);
      bounds[3] = Math.max(bounds[3], lat);
    }
    return;
  }
  value.forEach(item => visitCoordinates(item, bounds));
}

function normalizeCatalog(value, key) {
  return Array.isArray(value) ? value
    : value?.features ?? value?.[key] ?? [];
}

function details(item) {
  return item?.properties ?? item ?? {};
}

function catalogId(item) {
  const data = details(item);
  return data.id ?? data.buildingId ?? data.floorId ?? item?.id;
}

function catalogName(item) {
  const data = details(item);
  return data.name ?? data.buildingName ?? data.floorName;
}

function findCatalog(items, id, name) {
  return items.find(item => (id != null && text(catalogId(item)) === text(id))
    || (name && text(catalogName(item)) === text(name)));
}

function findFloor(items, id, z, buildingId) {
  return items.find(item => {
    const data = details(item);
    if (id != null && text(catalogId(item)) === text(id)) return true;
    const sameZ = numeric(data.z ?? data.zLevel) === z;
    const owner = data.buildingId;
    return sameZ && (owner == null || text(owner) === buildingId);
  });
}

function text(value) {
  return value == null ? "" : String(value).trim();
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
