// FEATURE:      Dynamic room background routing provider
// SURFACE:      resolveDynamicRoomRouteProvider(options)
// WHY TOGETHER: MazeMap request targets and response-path extraction form one Runner adapter.
// STATE:        Reads the engaged map adapter SDK lazily
// RULES:        Missing SDK or geometry fails explicitly; no direct-line fallback exists.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import { fetchLegGeoJSON } from "../../adapters/map/routing.mjs";
import { extractPath } from "../../domain/route-path.mjs";

export function resolveDynamicRoomRouteProvider({
  mapAdapter,
  routeProvider,
} = {}) {
  if (typeof routeProvider === "function") return routeProvider;
  return async (from, to) => {
    const Mazemap = mapAdapter?.Mazemap;
    if (!Mazemap) {
      throw new Error("MazeMap routing is unavailable before preflight");
    }
    const response = await fetchLegGeoJSON(
      Mazemap,
      routingTarget(from),
      routingTarget(to),
    );
    const geometry = extractPath(response, from, to);
    if (geometry.length < 2) {
      throw new Error("MazeMap routing returned no route geometry");
    }
    return geometry;
  };
}

function routingTarget(stop) {
  return {
    ...stop,
    targetType: stop.provenance?.method === "poi" ? "poi" : "point",
  };
}
