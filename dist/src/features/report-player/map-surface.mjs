// FEATURE:      Report Player shared MazeMap surface
// SURFACE:      createReportMapSurface(options)
// WHY TOGETHER: Public-first launch, one adapter lifecycle, fallback, resize, and mode layers share state.
// STATE:        One map adapter plus floor, analysis, Player frame, snap overlay, and launch outcome
// RULES:        Reuse one map; prompt only on typed denial; inactive Player writes no map layers.
// PROVENANCE:   Scope/steps/05a_recast_player.md
import { classifyMazeMapLaunchError } from "../../adapters/map/mazemap-errors.mjs";
import { drawRouteFallback } from "./map-fallback.mjs";
import { createMapFloorSync } from "./map-floor-sync.mjs";
import { createMapFrame } from "./map-model.mjs";
import { createMapSurfaceLayout, routeCenter, safelyCreateMap } from "./map-surface-layout.mjs";
export function createReportMapSurface({
  result, canvas, mapElement,
  fallbackElement,
  statusElement,
  createMap, createPrivateMap,
  ResizeObserverRef = globalThis.ResizeObserver,
}) {
  let analysis = null;
  let heatKind = "sticky";
  let playerFrame = null;
  let snap = null;
  let viewMode = "analysis";
  let mapMode = "launching";
  let launchPromise = null;
  const { adapter, error: adapterError } = safelyCreateMap(createMap ?? createPrivateMap);
  const layout = createMapSurfaceLayout({
    adapter,
    mapElement,
    route: result.route,
    ResizeObserverRef,
  });
  const floorSync = createMapFloorSync({
    adapter,
    initialFloor: result.meta.zLevels[0],
    onNativeChange() {
      if (mapMode === "mazemap" && viewMode === "analysis")
        adapter.drawReportHeat(heatKind, analysis);
    },
  });
  function start() {
    return launchPromise ??= launch(null, "public-launch");
  }
  async function launch(token, phase) {
    if (!adapter) return fallback(adapterError ?? new Error("MazeMap adapter is unavailable"));
    showMap("Loading public campus map…");
    try {
      const launchedFloor = await adapter.launch(token, null, {
        campusId: result.meta.campusId,
        campusName: result.meta.campusName,
        center: routeCenter(result.route),
        route: result.route,
        container: mapElement,
      });
      configureMap(launchedFloor);
      mapMode = "mazemap";
      showMap(token ? "MazeMap access active." : "Public MazeMap active.");
      await layout.settle();
      renderActive();
      return Object.freeze({ status: "ready", mode: mapMode });
    } catch (cause) {
      const error = cause?.classification
        ? cause
        : classifyMazeMapLaunchError(cause, phase);
      fallback(error);
      const status = error.promptForAccess ? "access-denied" : "fallback";
      return Object.freeze({ status, error, mode: mapMode });
    }
  }
  function configureMap(launchedFloor) {
    floorSync.start(launchedFloor);
    adapter.drawRoute(result.route.legs);
    adapter.drawStops(result.route.stops);
    adapter.drawWaypoints(result.route.checkpoints);
    adapter.drawReportNotes?.(result.notes ?? []);
    adapter.setViewMode(viewMode);
  }
  function render(next = {}) {
    const reportChanged = Object.hasOwn(next, "analysis") || Object.hasOwn(next, "heatKind");
    if (Object.hasOwn(next, "floor"))
      floorSync.command(next.floor, mapMode === "mazemap");
    if (Object.hasOwn(next, "analysis")) analysis = next.analysis;
    if (Object.hasOwn(next, "heatKind")) heatKind = next.heatKind;
    if (Object.hasOwn(next, "frame")) playerFrame = next.frame;
    if (Object.hasOwn(next, "snap")) snap = next.snap;
    renderActive(reportChanged);
    return fallbackModel();
  }
  function renderActive(forceReport = false) {
    if (mapMode === "mazemap") {
      if (forceReport || viewMode === "analysis") adapter.drawReportHeat(heatKind, analysis);
      if (viewMode === "playback" && playerFrame)
        adapter.drawPlayerFrame(playerFrame, snap);
    } else if (mapMode === "fallback") drawRouteFallback(canvas, fallbackModel());
  }
  function setViewMode(mode) {
    viewMode = mode;
    adapter?.setViewMode(mode);
    if (mode === "analysis") {
      adapter?.disablePlayerLayers();
      playerFrame = null;
      snap = null;
    }
    renderActive();
    layout.settle();
    return viewMode;
  }
  function fallback(error) {
    floorSync.stop();
    mapMode = "fallback";
    mapElement.hidden = true;
    fallbackElement.hidden = false;
    statusElement.textContent = "MazeMap unavailable · labelled route fallback active";
    drawRouteFallback(canvas, fallbackModel());
    return Object.freeze({ status: "fallback", error, mode: mapMode });
  }
  function showMap(message) {
    mapElement.hidden = false;
    fallbackElement.hidden = true;
    statusElement.textContent = message;
  }
  function fallbackModel() {
    return createMapFrame(result, {
      floor: floorSync.floor,
      analysis,
      frame: playerFrame,
      heatKind,
    });
  }
  return Object.freeze({
    destroy() {
      floorSync.destroy();
      layout.disconnect();
      adapter?.disablePlayerLayers?.();
    },
    declineAccess: () => fallback(new Error("MazeMap access was declined")),
    followWalker: walker => adapter?.followWalker?.(walker),
    focusEvidence: (id, trigger) => adapter?.focusEvidence?.(id, trigger),
    onEvidenceSelect: callback => adapter?.onEvidenceSelect?.(callback) ?? (() => {}),
    onFloorChange: floorSync.onChange,
    render,
    retryAccess: token => launch(token, "access-retry"),
    setViewMode,
    settleLayout: layout.settle,
    start,
    get adapter() { return adapter; },
    get floor() { return floorSync.floor; },
    get mapMode() { return mapMode; },
  });
}
