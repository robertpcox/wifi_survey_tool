import { CAMPUS_ID } from "../../domain/route-contract.mjs";
import { createMapLayers } from "./layers.mjs";
import {
  describePoi,
  fetchCampusCatalog,
} from "./mazemap-catalog.mjs";
import { createMapControls } from "./mazemap-controls.mjs";
import {
  errorMessage,
  normalizeCampusId,
  numericZ,
  waitForMapLoad,
} from "./mazemap-runtime.mjs";
import { loadMazemapSdk } from "./mazemap-sdk.mjs";

export function createMazeMapAdapter(options = {}) {
  let Mazemap = options.Mazemap ?? null;
  let campusId = normalizeCampusId(options.campusId ?? CAMPUS_ID);
  let campusName = null;
  let currentZLevel = 1;
  let layers = null;
  let map = null;
  let activeCatalog = { buildings: [], floors: [] };
  const catalogCache = new Map();
  const controls = createMapControls({
    currentZ: () => currentZLevel,
    layers: () => layers,
    map: () => map,
    sdk: () => Mazemap,
    setCurrentZ: value => { currentZLevel = value; },
  });

  async function resolveSdk() {
    if (!Mazemap) {
      Mazemap = await (options.loadMazemap
        ? options.loadMazemap()
        : loadMazemapSdk({ timeoutMs: options.sdkTimeoutMs }));
    }
    if (!Mazemap?.Map || !Mazemap?.Config?.setMazemapViewToken) {
      throw new Error("MazeMap SDK is missing its Map or token configuration API");
    }
    return Mazemap;
  }

  async function launch(viewToken, onMapClick, runtime = {}) {
    if (!String(viewToken ?? "").trim()) throw new Error("Map access is required");
    const sdk = await resolveSdk();
    const nextCampusId = normalizeCampusId(runtime.campusId ?? campusId);
    sdk.Config.setMazemapViewToken(viewToken);
    activeCatalog = await loadCatalog(sdk, nextCampusId);
    campusId = nextCampusId;
    campusName = activeCatalog.name;
    controls.clearTargetMarker();
    map?.remove?.();
    layers = null;
    try {
      map = new sdk.Map({
        container: options.container ?? "map",
        campuses: campusId,
        zoom: 18,
        center: activeCatalog.center,
      });
    } catch (error) {
      throw new Error(`Unable to create MazeMap: ${errorMessage(error)}`);
    }
    await waitForMapLoad(map, options.mapLoadTimeoutMs ?? 10000);
    currentZLevel = numericZ(controls.getMapZLevel()) ?? 1;
    layers = createMapLayers(map, () => currentZLevel);
    layers.ensureLayers();
    if (onMapClick) map.on("click", onMapClick);
    return currentZLevel;
  }

  async function loadCatalog(sdk, selectedCampusId) {
    const cacheKey = String(selectedCampusId);
    if (!catalogCache.has(cacheKey)) {
      const load = fetchCampusCatalog(sdk, selectedCampusId, options.center)
        .catch(error => {
          catalogCache.delete(cacheKey);
          throw error;
        });
      catalogCache.set(cacheKey, load);
    }
    return catalogCache.get(cacheKey);
  }

  async function describePoint(lng, lat, z) {
    const sdk = await resolveSdk();
    if (typeof sdk.Data?.getPoiAt !== "function") {
      throw new Error("MazeMap point lookup is unavailable in this SDK");
    }
    return describePoi(
      await sdk.Data.getPoiAt({ lng, lat }, z),
      z,
      activeCatalog,
    );
  }

  async function lookupPoi(id) {
    const sdk = await resolveSdk();
    if (typeof sdk.Data?.getPoi !== "function") {
      throw new Error("MazeMap POI lookup is unavailable in this SDK");
    }
    return sdk.Data.getPoi(id);
  }

  return {
    ...controls,
    describePoint,
    drawRoute: legs => layers?.drawRoute(legs),
    drawStops: stops => layers?.drawStops(stops),
    drawTrails: samples => layers?.drawTrails(samples),
    drawWaypoints: waypoints => layers?.drawWaypoints(waypoints),
    get campusId() { return campusId; },
    get campusName() { return campusName; },
    get currentZLevel() { return currentZLevel; },
    get Mazemap() { return Mazemap; },
    get ready() { return Boolean(map && layers); },
    launch,
    lookupPoi,
    setActiveLeg: legIndex => layers?.setActiveLeg(legIndex),
  };
}
