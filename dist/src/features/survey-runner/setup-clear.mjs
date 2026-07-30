// FEATURE:      Runner capture-state clearing
// SURFACE:      clearRunnerCaptureState(options)
// WHY TOGETHER: State, map overlays, and view resets must clear as one action.
// STATE:        Mutates caller-owned Runner state
// RULES:        Clearing never touches retained one-time entry values.
// PROVENANCE:   Run-from-file survey definition request

export function clearRunnerCaptureState({ state, mapAdapter, formView, runView }) {
  state.definition = null;
  state.mode = null;
  state.preflight = null;
  state.polls = [];
  state.activeRun = null;
  state.lastResult = null;
  state.busy = false;
  mapAdapter.drawPositionTrail?.([]);
  mapAdapter.drawRoute?.([]);
  mapAdapter.drawStops?.([]);
  mapAdapter.drawWaypoints?.([]);
  mapAdapter.setActiveLeg?.(null);
  mapAdapter.clearTargetMarker?.();
  formView.setRunning(false);
  formView.resetRouteSelection?.();
  runView.resetSession?.();
}
