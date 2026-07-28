import { parseRouteDefinition } from "../../domain/route-model.mjs";
import { ROUTE_FORMAT_VERSION } from "../../domain/route-contract.mjs";

export function createRouteFiles(options) {
  const {
    routeState,
    repository,
    view,
    editor,
    makeDefinition,
    downloadFile,
    refreshSavedRoutes,
  } = options;

  function exportRoute() {
    if (!routeState.stops.length) {
      view.setStatus("err", "Add at least one stop before exporting");
      return;
    }
    const name = view.routeName() || "unnamed";
    const safeName = name
      .replace(/[^a-z0-9_-]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "unnamed";
    downloadFile(
      `route-${safeName}.json`,
      JSON.stringify(makeDefinition(name), null, 2),
      "application/json",
    );
    view.setStatus(
      "ok",
      `Exported route "${name}" in v${ROUTE_FORMAT_VERSION} format`,
    );
  }

  async function importRoute(input) {
    const file = input.files?.[0];
    if (!file) return;
    input.value = "";
    try {
      const data = JSON.parse(await file.text());
      const fallbackName = file.name
        .replace(/\.json$/i, "")
        .replace(/^route-/, "") || "Imported route";
      const route = parseRouteDefinition(data, fallbackName);
      editor.applyRoute(route.stops, route.name, false);
      repository.saveRoute(
        route.name,
        makeDefinition(route.name, route.stops),
      );
      refreshSavedRoutes(`local:${route.name}`);
      view.setStatus(
        "ok",
        `Imported and saved "${route.name}" (${route.stops.length} stops) `
          + "— hit Build route",
      );
    } catch (error) {
      view.setStatus("err", `Route import failed: ${error.message}`);
    }
  }

  return {
    exportRoute,
    importRoute,
  };
}
