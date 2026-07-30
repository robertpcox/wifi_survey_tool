// FEATURE:      MazeMap provider adapter
// SURFACE:      createMazeMapAdapter(options)
// WHY TOGETHER: Public-first launch, legacy route tools, and shared-map facade compose one provider.
// STATE:        One SDK, map, campus catalog, floor, and stable layer set
// RULES:        Configure access only when supplied; Report and Player reuse the loaded map.
// PROVENANCE:   Scope/steps/05a_recast_player.md MazeMap adapter contract
import { CAMPUS_ID } from "../../domain/route-contract.mjs";
import { createMazeMap3dState } from "./mazemap-3d.mjs";
import { createMapLayers } from "./layers.mjs";
import { createMapControls } from "./mazemap-controls.mjs";
import { classifyMazeMapLaunchError } from "./mazemap-errors.mjs";
import {
  campusForLaunch, createLoadedMazeMap, launchCenter, resolveLaunchContainer,
} from "./mazemap-launch.mjs";
import { normalizeCampusId, numericZ } from "./mazemap-runtime.mjs";
import { resolveMazemapSdk } from "./mazemap-sdk.mjs";
import { createMazeMapQueries } from "./mazemap-queries.mjs";
import { createMazeMapSharedBoundary } from "./mazemap-shared-boundary.mjs";
import { resizeMapAfterLayout } from "./map-resize.mjs";
import { createSharedMapLayers } from "./shared-map-layers.mjs";
export function createMazeMapAdapter(options = {}) {
  let Mazemap = options.Mazemap ?? null;
  let campusId = normalizeCampusId(options.campusId ?? CAMPUS_ID);
  let campusName = null;
  let currentZLevel = 1;
  let layers = null, map = null;
  let resolvedContainer = null, sharedLayers = null;
  let activeCatalog = { buildings: [], floors: [] };
  const catalogCaches = { public: new Map(), token: new Map() };
  const threeD = createMazeMap3dState(options.threeD, options.threeDPitch);
  const controls = createMapControls({
    currentZ: () => currentZLevel,
    focusPitch: () => threeD.pitch,
    layers: () => ({ applyZStyling }),
    map: () => map,
    sdk: () => Mazemap,
    setCurrentZ: value => { currentZLevel = value; },
  });
  const shared = createMazeMapSharedBoundary({ setFloor });
  const queries = createMazeMapQueries(resolveSdk, () => activeCatalog);
  async function resolveSdk() {
    Mazemap = await resolveMazemapSdk(Mazemap, options);
    return Mazemap;
  }
  async function launch(viewToken, onMapClick, runtime = {}) {
    const token = String(viewToken ?? "").trim();
    let phase = "container";
    try {
      const containerInput = runtime.container
        ?? resolvedContainer
        ?? options.container;
      const container = resolveLaunchContainer(containerInput, {
        documentRef: options.documentRef,
        publicAttempt: !token,
      });
      if (!token || typeof container === "object") resolvedContainer = container;
      phase = "sdk-load";
      const sdk = await resolveSdk();
      const nextCampusId = normalizeCampusId(runtime.campusId ?? campusId);
      phase = "token-config";
      if (token) {
        if (typeof sdk.Config?.setMazemapViewToken !== "function") {
          throw new Error("MazeMap SDK is missing its token configuration API.");
        }
        sdk.Config.setMazemapViewToken(token);
      }
      phase = "catalog";
      activeCatalog = await campusForLaunch({
        cache: catalogCaches[token ? "token" : "public"],
        campusId: nextCampusId,
        campusName: runtime.campusName,
        center: launchCenter(runtime, options.center),
        sdk,
      });
      campusId = nextCampusId;
      campusName = activeCatalog.name;
      controls.clearTargetMarker();
      map?.remove?.();
      layers = null;
      sharedLayers = null;
      phase = "map-load";
      map = await createLoadedMazeMap(
        sdk,
        threeD.mapOptions(container, campusId, activeCatalog.center),
        options.mapLoadTimeoutMs ?? 10000,
      );
      threeD.apply(map);
      currentZLevel = numericZ(controls.getMapZLevel()) ?? 1;
      phase = "layer-init";
      layers = createMapLayers(map, () => currentZLevel);
      layers.ensureLayers();
      sharedLayers = createSharedMapLayers(map, () => currentZLevel);
      shared.bind(sharedLayers);
      if (onMapClick) map.on("click", onMapClick);
      return currentZLevel;
    } catch (error) {
      if (phase !== "map-load") map?.remove?.();
      if (!layers) map = null;
      throw classifyMazeMapLaunchError(error, phase);
    }
  }
  function applyZStyling() {
    layers?.applyZStyling();
    sharedLayers?.applyFloor();
  }
  function setFloor(value) {
    const z = numericZ(value);
    if (z == null) return false;
    currentZLevel = z;
    controls.setMapZLevel(z);
    applyZStyling();
    return true;
  }
  function fitRoute(route) {
    const fitted = controls.fitRoute(route);
    currentZLevel = numericZ(controls.getMapZLevel()) ?? currentZLevel;
    applyZStyling();
    return fitted;
  }
  function drawPlayerFrame(frame, snap) {
    const drawn = shared.drawPlayerFrame(frame, snap);
    if (drawn) layers?.setActiveLeg(frame?.walker?.activeLegIndex ?? frame?.activeLegIndex);
    return drawn;
  }
  return {
    ...controls,
    ...shared,
    ...queries,
    drawPositionTrail: polls => layers?.drawPositionTrail(polls),
    drawPlayerFrame,
    drawRoute: legs => layers?.drawRoute(legs),
    drawStops: stops => layers?.drawStops(stops),
    drawTrails: samples => layers?.drawTrails(samples),
    drawWaypoints: waypoints => layers?.drawWaypoints(waypoints),
    fitRoute,
    launch,
    resizeMapSoon: () => resizeMapAfterLayout(map, options.requestAnimationFrame),
    setActiveLeg: index => layers?.setActiveLeg(index),
    set3dEnabled: enabled => threeD.set(map, enabled),
    setMapZLevel: setFloor,
    get campusId() { return campusId; },
    get campusName() { return campusName; },
    get currentZLevel() { return currentZLevel; },
    get Mazemap() { return Mazemap; },
    get ready() { return Boolean(map && layers && sharedLayers); },
    get threeDEnabled() { return threeD.enabled; },
  };
}
