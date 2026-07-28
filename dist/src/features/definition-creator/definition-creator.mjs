import { createDefinitionCreatorController } from "./controller.mjs";
import { createCreatorMapSession } from "./map-session.mjs";
import { resolveCreatorProviders } from "./providers.mjs";
import { createStopActions } from "./stop-actions.mjs";
import { createDefinitionCreatorView } from "./view.mjs";
import { createCreatorWorkflow } from "./workflow.mjs";

export function mountDefinitionCreator(options = {}) {
  const documentRef = options.documentRef ?? globalThis.document;
  const root = options.root
    ?? documentRef?.querySelector?.("[data-definition-creator]");
  if (!root) {
    throw new TypeError(
      "Creator mount: [data-definition-creator] container is missing",
    );
  }
  const providers = resolveCreatorProviders(options);
  const view = options.view ?? createDefinitionCreatorView(root);
  const workflow = options.workflow ?? createCreatorWorkflow({
    cryptoRef: options.cryptoRef ?? options.crypto,
    now: options.now,
    routeProvider: providers.routeProvider,
  });
  const stopActions = options.stopActions ?? createStopActions({
    accuracyThresholdM: options.accuracyThresholdM,
    capturePosition: options.capturePosition,
    lookupPoi: providers.lookupPoi,
  });
  const controller = createDefinitionCreatorController({
    configuredCampusId: options.configuredCampusId,
    downloadDefinition: options.downloadDefinition,
    mapAdapter: options.mapAdapter,
    readDefinition: options.readDefinition,
    stopActions,
    view,
    workflow,
  });
  const mapSession = createCreatorMapSession({
    credentials: options.credentials,
    mapAdapter: options.mapAdapter,
    view,
  });
  let engagement = null;
  const removeAction = view.onAction((action, button) => {
    const task = action === "engage-map"
      ? engage()
      : controller.dispatch(action, button);
    void Promise.resolve(task).catch(error => {
      view.setStatus(error.message, "error");
    });
  });
  view.setEngaged?.(false);
  view.setRouteMode("Engage MazeMap to load the campus and routing.");
  const removeImport = view.onImport(() => {
    void controller.importDefinition().catch(error => {
      view.setStatus(error.message, "error");
    });
  });
  async function engage() {
    if (engagement) return engagement;
    engagement = engageOnce().catch(error => {
      engagement = null;
      throw error;
    });
    return engagement;
  }
  async function engageOnce() {
    controller.assertCanEngage(view.readFields().campusId);
    const details = await mapSession.engage();
    controller.engage(details);
    view.setRouteMode(providers.routeProvider
      ? "MazeMap route geometry is active for committed stops."
      : "Using straight exact-line geometry; MazeMap routing is unavailable.");
    return details;
  }
  return Object.freeze({
    ...controller,
    engage,
    destroy() {
      workflow.cancel?.();
      removeAction?.();
      removeImport?.();
    },
  });
}
