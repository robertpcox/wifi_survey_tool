import { createMazeMapAdapter } from "../../adapters/map/mazemap.mjs";
import { restorePrefs } from "../../adapters/preferences.mjs";
import { createRouteRepository } from "../../adapters/route-storage.mjs";
import {
  createRouteState,
  createSessionState,
} from "../../domain/survey-state.mjs";
import { createCreator } from "../../features/creator/creator.mjs";
import { createRunner } from "../../features/runner/runner.mjs";
import { createAppUi } from "./app-ui.mjs";

export async function bootRouteSurvey(options = {}) {
  const windowRef = options.windowRef ?? window;
  const documentRef = options.documentRef ?? document;
  const storage = options.storage ?? localStorage;
  const Mazemap = options.Mazemap ?? windowRef.Mazemap;
  const routeState = createRouteState();
  const sessionState = createSessionState();
  const mapAdapter = createMazeMapAdapter({ Mazemap });
  const ui = createAppUi(documentRef, windowRef);
  const repository = createRouteRepository({
    storage,
    fetchImpl: options.fetchImpl ?? windowRef.fetch.bind(windowRef),
  });
  let runner;
  const creator = createCreator({
    routeState,
    documentRef,
    mapAdapter,
    repository,
    Mazemap,
    setStatus: ui.setStatus,
    isRouteEditingBlocked: () => runner?.isRouteEditingBlocked() ?? false,
    onRouteChanged: (_state, reason) => {
      if (reason === "route-built") runner?.routeBuilt();
      else runner?.routeInvalidated();
    },
  });
  runner = createRunner({
    routeState,
    sessionState,
    documentRef,
    mapAdapter,
    setStatus: ui.setStatus,
    fetchImpl: options.fetchImpl,
  });

  async function launchMap() {
    if (mapAdapter.ready) {
      ui.setStatus("", "Map is already running");
      return;
    }
    const accessInput = documentRef.getElementById("mapAccess");
    let access = accessInput.value.trim();
    accessInput.value = "";
    if (!access) {
      ui.setStatus("err", "Enter map access before launching the map");
      return;
    }
    if (!Mazemap) {
      ui.setStatus("err", "MazeMap failed to load");
      return;
    }
    try {
      const floor = await mapAdapter.launch(access, creator.onMapClick);
      access = null;
      documentRef.getElementById("curFloor").textContent = floor;
      mapAdapter.startZWatch(value => {
        documentRef.getElementById("curFloor").textContent = value;
      });
      mapAdapter.drawStops(routeState.stops);
      mapAdapter.drawRoute(routeState.legs);
      mapAdapter.drawWaypoints(routeState.waypoints);
      mapAdapter.drawTrails(sessionState.samples);
      if (routeState.selectionVersion > 0 && !routeState.legs.length) {
        await creator.actions.buildRoute();
      } else {
        runner.updateWalkCard();
        ui.setStatus("", "Select a test route above, then tap Load.");
      }
    } catch (error) {
      access = null;
      ui.setStatus("err", `Map launch failed: ${error.message}`);
    }
  }

  removeStoredCredentials(storage);
  restorePrefs(documentRef, storage);
  ui.bindActions(
    creator.actions,
    runner.actions,
    { launchMap },
  );
  ui.wireMapResize(mapAdapter);
  runner.initialize();
  await creator.initialize();
  ui.setStatus("", "Enter map access, then launch the map.");
  return {
    creator,
    launchMap,
    mapAdapter,
    routeState,
    runner,
    sessionState,
  };
}

function removeStoredCredentials(storage) {
  storage.removeItem("routeSurvey.v1.appId");
  storage.removeItem("routeSurvey.v1.appKey");
  storage.removeItem("routeSurvey.v1.mapAccess");
}

if (typeof document !== "undefined") {
  bootRouteSurvey().catch(error => {
    console.error("Route Survey failed to start:", error);
  });
}
