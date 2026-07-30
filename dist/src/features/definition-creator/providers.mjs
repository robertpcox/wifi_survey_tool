import {
  fetchLegGeoJSON,
  getPoi,
} from "../../adapters/map/routing.mjs";
import { extractPath } from "../../domain/route-path.mjs";

export function resolveCreatorProviders({
  Mazemap,
  mapAdapter,
  lookupPoi,
  routeProvider,
} = {}) {
  const sdk = () => Mazemap ?? mapAdapter?.Mazemap;
  return {
    lookupPoi: lookupPoi ?? defaultPoiLookup(sdk, mapAdapter),
    routeProvider: routeProvider ?? defaultRouteProvider(sdk, mapAdapter),
  };
}

function defaultPoiLookup(sdk, mapAdapter) {
  if (!mapAdapter && typeof sdk()?.Data?.getPoi !== "function") return undefined;
  return async id => {
    if (typeof mapAdapter?.lookupPoi === "function") {
      return mapAdapter.lookupPoi(id);
    }
    const Mazemap = requireSdk(sdk(), "POI lookup");
    return getPoi(Mazemap, id);
  };
}

function defaultRouteProvider(sdk, mapAdapter) {
  if (!mapAdapter && typeof sdk()?.Data?.getRouteJSON !== "function") return undefined;
  return async (from, to) => {
    const Mazemap = requireSdk(sdk(), "routing");
    const response = await fetchLegGeoJSON(
      Mazemap,
      routingTarget(from),
      routingTarget(to),
    );
    const geometry = extractPath(response, from, to);
    if (geometry.length < 2) {
      throw new Error("provider returned no route geometry");
    }
    return geometry;
  };
}

function requireSdk(Mazemap, operation) {
  if (!Mazemap) throw new Error(`MazeMap ${operation} is unavailable before Engage`);
  return Mazemap;
}

function routingTarget(stop) {
  return {
    ...stop,
    targetType: stop.provenance?.method === "poi" ? "poi" : "point",
  };
}
