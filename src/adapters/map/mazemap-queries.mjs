// FEATURE:      MazeMap point metadata queries
// SURFACE:      createMazeMapQueries(resolveSdk, currentCatalog, currentCampusId)
// WHY TOGETHER: Point lookup and the campus polygon catalogue share lazy SDK access.
// STATE:        Reads the adapter's current campus catalog through a callback
// RULES:        Missing SDK query APIs fail explicitly without leaking provider internals.
// PROVENANCE:   Existing Creator/Runner MazeMap query contract preserved in Step 5a

import { describePoi } from "./mazemap-catalog.mjs";
import {
  mergeMazeMapRooms,
  normalizeMazeMapRoom,
} from "./mazemap-room.mjs";

export function createMazeMapQueries(
  resolveSdk,
  currentCatalog,
  currentCampusId = () => null,
) {
  const poiCache = new Map();

  async function describePoint(lng, lat, z) {
    const sdk = await resolveSdk();
    if (typeof sdk.Data?.getPoiAt !== "function") {
      throw new Error("MazeMap point lookup is unavailable in this SDK");
    }
    return describePoi(
      await sdk.Data.getPoiAt({ lng, lat }, z),
      z,
      currentCatalog(),
    );
  }

  function lookupPoi(id) {
    const key = String(id);
    if (!poiCache.has(key)) {
      const pending = Promise.resolve().then(async () => {
        const sdk = await resolveSdk();
        if (typeof sdk.Data?.getPoi !== "function") {
          throw new Error("MazeMap POI lookup is unavailable in this SDK");
        }
        return sdk.Data.getPoi(id);
      }).catch(cause => {
        poiCache.delete(key);
        throw cause;
      });
      poiCache.set(key, pending);
    }
    return poiCache.get(key);
  }

  async function resolveRoomAt(lng, lat, z) {
    const sdk = await resolveSdk();
    if (typeof sdk.Data?.getPoiAt !== "function") {
      throw new Error("MazeMap room lookup is unavailable in this SDK");
    }
    const nearby = await sdk.Data.getPoiAt({ lng, lat }, z);
    if (!nearby) return null;
    const fallback = normalizeMazeMapRoom(nearby, z);
    if (fallback?.geometry || !fallback?.id
        || typeof sdk.Data?.getPoi !== "function") return fallback;
    const detailed = normalizeMazeMapRoom(await lookupPoi(fallback.id), z);
    return mergeMazeMapRooms(detailed, fallback);
  }

  async function resolveRoomById(id, z) {
    return normalizeMazeMapRoom(await lookupPoi(id), z);
  }

  async function resolveCampusRooms() {
    const sdk = await resolveSdk();
    if (typeof sdk.Data?.getPois !== "function") {
      throw new Error("MazeMap campus room catalogue is unavailable in this SDK");
    }
    const campusid = Number(currentCampusId());
    if (!Number.isInteger(campusid) || campusid <= 0) {
      throw new Error("MazeMap campus room catalogue requires a campus ID");
    }
    const buildings = catalogueItems(currentCatalog()?.buildings, "buildings");
    const buildingIds = [...new Set(buildings.map(catalogueId).filter(Boolean))];
    const queries = buildingIds.length
      ? buildingIds.map(buildingid => ({ campusid, buildingid }))
      : [{ campusid }];
    const batches = await Promise.all(queries.map(query => sdk.Data.getPois(query)));
    const unique = new Map();
    for (const poi of batches.flatMap(providerFeatures)) {
      const room = normalizeMazeMapRoom(poi);
      if (!room?.geometry || !Number.isFinite(room.z)) continue;
      const key = room.id
        ? `${room.z}:poi:${room.id}`
        : `${room.z}:geometry:${JSON.stringify(room.geometry)}`;
      if (!unique.has(key)) unique.set(key, room);
    }
    const rooms = [...unique.values()];
    if (!rooms.length) {
      throw new Error("MazeMap campus room catalogue returned no polygon POIs");
    }
    return rooms;
  }

  return Object.freeze({
    describePoint,
    lookupPoi,
    resolveCampusRooms,
    resolveRoomAt,
    resolveRoomById,
  });
}

function providerFeatures(value) {
  if (Array.isArray(value)) return value.flatMap(providerFeatures);
  if (value?.type === "FeatureCollection") return value.features ?? [];
  if (value?.type === "Feature") return [value];
  if (Array.isArray(value?.features)) return value.features;
  if (Array.isArray(value?.pois)) return value.pois;
  return value && typeof value === "object" ? [value] : [];
}

function catalogueItems(value, key) {
  return Array.isArray(value) ? value : value?.features ?? value?.[key] ?? [];
}

function catalogueId(item) {
  const data = item?.properties ?? item ?? {};
  const id = data.id ?? data.buildingId ?? item?.id;
  return id == null || String(id).trim() === "" ? null : id;
}
