// FEATURE:      Creator route mutations
// SURFACE:      createCreatorRouteActions(options)
// WHY TOGETHER: Stop commits share atomic state, selection, warning, render, and status updates.
// STATE:        Creator controller route state
// RULES:        Appends route one leg; replans reuse geometry; reshuffles rebuild all legs.
// PROVENANCE:   Creator field feedback

export function createCreatorRouteActions({
  render,
  state,
  view,
  workflow,
}) {
  async function commit(
    operation,
    stops,
    message,
    selection = -1,
    warning = null,
  ) {
    const result = await workflow[operation](stops, state.plan, state.route);
    if (result.stale) return;
    state.stops = stops;
    state.route = result;
    state.selectedIndex = selection;
    view.selectStop(selection < 0 ? null : stops[selection], selection);
    if (warning) view.showGpsWarning(warning);
    render();
    view.setStatus(message, "ok");
  }

  return {
    add(stop, warning = null) {
      return commit(
        "append",
        [...state.stops, stop],
        `${stop.name} added; new leg and review updated.`,
        -1,
        warning,
      );
    },
    replan(stops, message, selection = -1) {
      return commit("replan", stops, message, selection);
    },
    reshuffle(stops, message, selection = -1) {
      return commit("rebuild", stops, message, selection);
    },
  };
}
