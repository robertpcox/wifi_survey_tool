// FEATURE:      Creator dwell interactions
// SURFACE:      Save-checkpoint-dwell and clear-checkpoint-dwell actions
// WHY TOGETHER: Both actions update the same route state and render boundary.
// STATE:        Current Creator route
// RULES:        Clear means zero seconds; all edits require a locked checkpoint plan.
// PROVENANCE:   Scope/steps/03_build_creator.md

const ACTIONS = new Set([
  "save-checkpoint-dwell",
  "clear-checkpoint-dwell",
]);

export function createCreatorDwellActions({
  render,
  requirePlan,
  state,
  view,
  workflow,
}) {
  return {
    dispatch(action, button = {}) {
      if (!ACTIONS.has(action)) return false;
      requirePlan();
      const sequence = Number(button.dataset?.sequence);
      const dwellSeconds = action === "clear-checkpoint-dwell"
        ? 0
        : view.readCheckpointDwell(sequence);
      state.route = workflow.updateCheckpointDwell(
        state.route,
        sequence,
        dwellSeconds,
      );
      render();
      view.setStatus(`Checkpoint ${sequence + 1} dwell updated.`, "ok");
      return true;
    },
  };
}
