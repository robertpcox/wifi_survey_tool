// FEATURE:      MazeMap point metadata queries
// SURFACE:      createMazeMapQueries(resolveSdk, currentCatalog)
// WHY TOGETHER: POI lookup and provider-neutral point description share lazy SDK access.
// STATE:        Reads the adapter's current campus catalog through a callback
// RULES:        Missing SDK query APIs fail explicitly without leaking provider internals.
// PROVENANCE:   Existing Creator/Runner MazeMap query contract preserved in Step 5a

import { describePoi } from "./mazemap-catalog.mjs";

export function createMazeMapQueries(resolveSdk, currentCatalog) {
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

  async function lookupPoi(id) {
    const sdk = await resolveSdk();
    if (typeof sdk.Data?.getPoi !== "function") {
      throw new Error("MazeMap POI lookup is unavailable in this SDK");
    }
    return sdk.Data.getPoi(id);
  }

  return Object.freeze({ describePoint, lookupPoi });
}
