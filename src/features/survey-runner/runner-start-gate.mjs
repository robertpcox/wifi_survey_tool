// FEATURE:      Runner start gate
// SURFACE:      prepareRunnerStart(options, overridden)
// WHY TOGETHER: Planned and dynamic modes share preflight acknowledgement and entry gating.
// STATE:        Mutates the selected preflight acknowledgement only after acceptance
// RULES:        Amber/red requires the explicit override checkbox.
// PROVENANCE:   Step 4 Runner dynamic-room extension

export function prepareRunnerStart(options, overridden = false) {
  const { state, setup, formView } = options;
  if (!state.preflight || !setup.entryComplete()) return false;
  if (!overridden && state.preflight.verdict !== "green") return false;
  if (overridden && !formView.readValues().override) return false;
  state.preflight = { ...state.preflight, acknowledged: overridden };
  options.noteController.reset();
  return true;
}
