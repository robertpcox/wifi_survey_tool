import { downloadFile as downloadBrowserFile } from "../../adapters/files.mjs";
import { createRouteRepository } from "../../adapters/route-storage.mjs";
import { routeDefinition } from "../../domain/route-model.mjs";
import { createRouteState } from "../../domain/survey-state.mjs";
import { createCreatorView } from "./creator-view.mjs";
import { createRouteBuilder } from "./route-builder.mjs";
import { createRouteEditor } from "./route-editor.mjs";
import { createRouteFiles } from "./route-files.mjs";
import { createRouteLibrary } from "./route-library.mjs";

export function createCreator(options = {}) {
  const routeState = options.routeState ?? createRouteState();
  const documentRef = options.documentRef ?? globalThis.document;
  const mapAdapter = options.mapAdapter ?? null;
  const repository = options.repository ?? createRouteRepository();
  const Mazemap = options.Mazemap ?? globalThis.Mazemap;
  const now = options.now ?? (() => new Date());
  const onRouteChanged = options.onRouteChanged;
  const view = createCreatorView(
    documentRef,
    mapAdapter,
    options.setStatus,
  );
  const editor = createRouteEditor({
    routeState,
    view,
    mapAdapter,
    Mazemap,
    isRouteEditingBlocked: options.isRouteEditingBlocked ?? (() => false),
    onRouteChanged,
  });
  const builder = createRouteBuilder({
    routeState,
    view,
    Mazemap,
    onRouteChanged,
  });
  const makeDefinition = (
    name,
    stops = routeState.stops,
  ) => routeDefinition(name, stops, { now });
  const library = createRouteLibrary({
    routeState,
    repository,
    view,
    editor,
    buildRoute: builder.buildRoute,
    mapAdapter,
    makeDefinition,
  });
  const files = createRouteFiles({
    routeState,
    repository,
    view,
    editor,
    makeDefinition,
    downloadFile: options.downloadFile
      ?? ((...args) => downloadBrowserFile(...args, documentRef)),
    refreshSavedRoutes: library.refreshSavedRoutes,
  });

  const actions = {
    addStopFromInput: editor.actions.addStopFromInput,
    buildRoute: builder.buildRoute,
    chooseMapTarget: editor.actions.chooseMapTarget,
    clearStops: editor.actions.clearStops,
    closeTargetChoice: editor.actions.closeTargetChoice,
    deleteRoute: library.actions.deleteRoute,
    exportRoute: files.exportRoute,
    importRoute: files.importRoute,
    loadRoute: library.actions.loadRoute,
    moveStop: editor.actions.moveStop,
    removeStop: editor.actions.removeStop,
    saveRoute: library.actions.saveRoute,
  };

  async function initialize() {
    await library.initialize();
    view.renderStops(routeState.stops);
    view.drawStops(routeState.stops);
    view.drawRoute(routeState.legs);
    view.drawWaypoints(routeState.waypoints);
    if (routeState.selectionVersion > 0 && mapAdapter?.ready) {
      await builder.buildRoute();
    } else if (routeState.selectionVersion === 0) {
      view.setStatus("", "Select a test route above, then tap Load.");
    }
  }

  return {
    actions,
    initialize,
    onMapClick: editor.onMapClick,
  };
}
