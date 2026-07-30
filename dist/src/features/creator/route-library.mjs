import { parseRouteDefinition } from "../../domain/route-model.mjs";

export function createRouteLibrary(options) {
  const {
    routeState,
    repository,
    view,
    editor,
    buildRoute,
    mapAdapter,
    makeDefinition,
  } = options;
  let serverRoutes = [];

  function refreshSavedRoutes(selectedKey) {
    view.refreshSavedRoutes(
      serverRoutes,
      repository.savedRouteMap(),
      selectedKey,
    );
  }

  async function initialize() {
    try {
      serverRoutes = await repository.loadServerRouteManifest();
    } catch (error) {
      serverRoutes = [];
      console.warn("Could not load server route manifest:", error);
    }
    refreshSavedRoutes();
  }

  function saveRoute() {
    const name = view.routeName();
    if (!name || !routeState.stops.length) {
      view.setStatus("err", "Route name and at least one stop required");
      return;
    }
    repository.saveRoute(name, makeDefinition(name));
    refreshSavedRoutes(`local:${name}`);
    view.setStatus(
      "ok",
      `Route "${name}" saved (${routeState.stops.length} stops)`,
    );
  }

  async function loadRoute() {
    if (routeState.loadBusy) return;
    routeState.loadBusy = true;
    view.setRouteLoadBusy(true);
    try {
      const selected = view.selectedRoute();
      if (!selected) {
        view.setStatus("err", "Select a test route first");
        return;
      }
      if (selected.startsWith("server:")) {
        await loadServerRoute(selected);
      } else {
        await loadLocalRoute(selected);
      }
    } catch (error) {
      view.setStatus("err", `Route load failed: ${error.message}`);
    } finally {
      routeState.loadBusy = false;
      view.setRouteLoadBusy(false);
    }
  }

  async function loadServerRoute(selected) {
    const route = serverRoutes[Number(selected.slice(7))];
    if (!route) return;
    editor.clearRouteForLoad();
    view.setStatus("polling", `Loading server route "${route.name}"…`);
    const data = await repository.loadServerRoute(route);
    const name = applyRouteData(data, route.name);
    view.collapseMobileConfig();
    if (mapAdapter?.ready) {
      await buildRoute();
    } else {
      view.setStatus(
        "polling",
        `Server route "${name}" loaded (${routeState.stops.length} stops) `
          + "— waiting for map",
      );
    }
  }

  async function loadLocalRoute(selected) {
    const name = selected.startsWith("local:") ? selected.slice(6) : selected;
    const entry = repository.savedRouteMap()[name];
    if (!entry) return;
    editor.clearRouteForLoad();
    applyRouteData(entry, name);
    view.collapseMobileConfig();
    if (mapAdapter?.ready) {
      await buildRoute();
    } else {
      view.setStatus(
        "polling",
        `Route "${name}" loaded (${routeState.stops.length} stops) `
          + "— waiting for map",
      );
    }
  }

  function applyRouteData(data, fallbackName) {
    const route = parseRouteDefinition(data, fallbackName);
    editor.applyRoute(route.stops, route.name, true);
    return route.name;
  }

  function deleteRoute() {
    const selected = view.selectedRoute();
    if (selected.startsWith("server:")) {
      view.setStatus(
        "err",
        "Server routes are managed in routes/index.json and cannot be "
          + "deleted in the browser",
      );
      return;
    }
    const name = selected.startsWith("local:") ? selected.slice(6) : selected;
    repository.deleteRoute(name);
    refreshSavedRoutes();
  }

  return {
    actions: {
      deleteRoute,
      loadRoute,
      saveRoute,
    },
    applyRouteData,
    initialize,
    refreshSavedRoutes,
  };
}
