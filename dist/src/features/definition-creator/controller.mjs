import { createCreatorControllerState, nextCreatorStopId } from "./controller-state.mjs";
import { clearCreatorRoute } from "./controller-clear-route.mjs";
import { createCreatorDwellActions } from "./controller-dwell.mjs";
import { createDefinitionFiles } from "./definition-files.mjs";
import { assertCreatorCampus, parseCreatorPlanFields } from "./form.mjs";
import { renderCreatorController } from "./controller-render.mjs";
import { reorderCreatorStops } from "./stop-order.mjs";
export function createDefinitionCreatorController(options) {
  const { view, workflow, stopActions, mapAdapter } = options;
  const state = createCreatorControllerState(); const configuredCampusId = () => state.engagedCampusId;
  const render = () => renderCreatorController({ mapAdapter, state, view });
  async function lockPlan() {
    if (state.planLocked) {
      state.planLocked = false;
      view.setPlanLocked(false);
      view.setStatus("Edit the checkpoint plan, then lock it to rebuild the route.", "ok");
      return;
    }
    const fields = view.readFields();
    const plan = parseCreatorPlanFields(fields);
    assertCreatorCampus({ campusId: fields.campusId }, configuredCampusId);
    const result = await workflow.rebuild(state.stops, plan);
    if (result.stale) return;
    state.plan = plan;
    state.route = result;
    state.planLocked = true;
    view.setPlanLocked(true);
    render();
    const message = state.stops.length
      ? "Checkpoint plan locked; route, checkpoints, and review updated."
      : "Checkpoint spacing and dwell are locked. Add the first stop.";
    view.setStatus(message, "ok");
  }
  function requirePlan() {
    if (!state.engagedCampusId) {
      throw new Error("Engage MazeMap before adding stops.");
    }
    if (!state.planLocked) throw new Error(
      "Lock checkpoint spacing and dwell before adding stops.",
    );
  }
  async function ensurePlan() {
    if (!state.planLocked) await lockPlan();
    requirePlan();
  }
  async function commitStops(stops, message, selection = -1, warning = null) {
    const result = await workflow.rebuild(stops, state.plan, state.route);
    if (result.stale) return;
    state.stops = stops;
    state.route = result;
    state.selectedIndex = selection;
    view.selectStop(selection < 0 ? null : stops[selection], selection);
    if (warning) view.showGpsWarning(warning);
    render();
    view.setStatus(message, "ok");
  }
  async function addStop(stop, warning = null) {
    return commitStops([...state.stops, stop],
      `${stop.name} added; route and review updated.`, -1, warning);
  }
  async function adjustSelected() {
    requirePlan();
    const index = state.selectedIndex;
    const adjusted = stopActions.adjust(view.readFields(), state.stops[index]);
    const stops = state.stops.map((stop, stopIndex) => (
      stopIndex === index ? adjusted : stop
    ));
    await commitStops(stops, `${adjusted.name} adjusted; route and review updated.`, index);
  }
  async function removeStop(index) {
    requirePlan();
    const removed = state.stops[index];
    if (!removed) throw new Error(`stop ${index + 1}: does not exist`);
    const stops = state.stops.filter((_stop, stopIndex) => stopIndex !== index);
    await commitStops(stops, `${removed.name} removed; route and review updated.`);
  }
  async function moveStop(index, offset) {
    requirePlan();
    const moved = reorderCreatorStops(state.stops, index, offset, state.selectedIndex);
    await commitStops(moved.stops,
      `${moved.movedStop.name} moved; route and review updated.`, moved.selectedIndex);
  }
  function selectStop(index) {
    const stop = state.stops[index];
    if (!stop) throw new Error(`stop ${index + 1}: does not exist`);
    state.selectedIndex = index;
    view.selectStop(stop, index);
    view.renderStops(state.stops, index);
  }
  const dwellActions = createCreatorDwellActions({ render, requirePlan, state, view, workflow });
  const files = createDefinitionFiles({
    ...options,
    configuredCampusId,
    render,
    state,
  });
  const actions = {
    "add-exact": async () => {
      await ensurePlan();
      await addStop(stopActions.exact(view.readFields(), nextCreatorStopId(state)));
    },
    "add-poi": async () => {
      await ensurePlan();
      await addStop(await stopActions.poi(view.readFields(), nextCreatorStopId(state)));
    },
    "adjust-stop": adjustSelected,
    "capture-gps": async () => {
      await ensurePlan();
      const result = await stopActions.gps(view.readFields(), nextCreatorStopId(state));
      await addStop(result.stop, result.warning);
    },
    "choose-import": () => view.chooseImport(),
    "clear-current-route": () => clearCreatorRoute({ render, state, view, workflow }),
    "dismiss-short-warning": () => {
      state.shortWarningDismissed = true;
      view.showShortWarning(null);
    },
    "export-definition": files.exportDefinition,
    "lock-plan": lockPlan,
  };
  async function dispatch(action, button = {}) {
    try {
      if (action === "select-stop") return selectStop(Number(button.dataset.index));
      if (action === "remove-stop") return await removeStop(Number(button.dataset.index));
      if (action === "move-stop-up") return await moveStop(Number(button.dataset.index), -1);
      if (action === "move-stop-down") return await moveStop(Number(button.dataset.index), 1);
      if (dwellActions.dispatch(action, button)) return undefined;
      if (!actions[action]) return undefined;
      return await actions[action]();
    } catch (error) {
      view.setStatus(error.message, "error");
      return undefined;
    }
  }
  render();
  return {
    assertCanEngage(campusId) {
      if (state.stops.length && String(campusId) !== String(state.engagedCampusId)) {
        throw new Error("Remove the current stops before changing the engaged campus.");
      }
    },
    dispatch,
    engage(details) { state.engagedCampusId = String(details.campusId);
      view.setEngaged?.(true); render(); },
    exportDefinition: files.exportDefinition,
    importDefinition: files.importDefinition,
    state,
  };
}
