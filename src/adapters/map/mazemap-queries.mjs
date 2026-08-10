// FEATURE:      MazeMap point metadata queries
// SURFACE:      createMazeMapQueries(resolveSdk, currentCatalog)
// WHY TOGETHER: POI lookup and provider-neutral point description share lazy SDK access.
// STATE:        Reads the adapter's current campus catalog through a callback
// RULES:        Missing SDK query APIs fail explicitly without leaking provider internals.
// PROVENANCE:   Existing Creator/Runner MazeMap query contract preserved in Step 5a

import { describePoi } from "./mazemap-catalog.mjs";
import {
  mergeMazeMapRooms,
  normalizeMazeMapRoom,
} from "./mazemap-room.mjs";

export function createMazeMapQueries(resolveSdk, currentCatalog) {
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

  return Object.freeze({ describePoint, lookupPoi, resolveRoomAt, resolveRoomById });
}
