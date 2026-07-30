// FEATURE:      Creator route reset
// SURFACE:      clearCreatorRoute(options)
// WHY TOGETHER: Clearing authored geometry must preserve the engaged authoring configuration.
// STATE:        Creator controller state and rendered map/route
// RULES:        Remove route points and imported identity; retain campus, plan, and form fields.
// PROVENANCE:   Scope/steps/03_build_creator.md

export async function clearCreatorRoute({
  render,
  state,
  view,
  workflow,
}) {
  const route = await workflow.rebuild([], state.plan, state.route);
  if (route.stale) return false;
  state.imported = null;
  state.route = route;
  state.selectedIndex = -1;
  state.shortWarningDismissed = false;
  state.stops = [];
  view.clearMapSelection?.();
  view.selectStop(null, -1);
  render();
  view.setStatus(
    "Current route cleared. Your campus, configuration, and checkpoint plan are unchanged.",
    "ok",
  );
  return true;
}
