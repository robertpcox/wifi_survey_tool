// FEATURE:      Runner note orchestration
// SURFACE:      createRunnerNoteController(options)
// WHY TOGETHER: First-failure prompting, manual actions, and armed map clicks share one controller.
// STATE:        Whether this run already prompted for its first source failure
// RULES:        Failed capture prompts once; map clicks are ignored unless placement is armed.
// PROVENANCE:   Runner offline field feedback

export function createRunnerNoteController(options) {
  let failurePrompted = false;

  function handleSample(sample, context) {
    if (context !== "capture" || sample?.success || failurePrompted) return;
    const run = options.state.activeRun;
    if (!run || run.state.completionStatus) return;
    failurePrompted = true;
    run.openNote("source-failure", sample?.error);
  }

  function handleMapClick(event) {
    if (!options.runView.placementArmed?.()) return false;
    const point = mapPoint(event, options.mapAdapter.currentZLevel);
    return options.state.activeRun?.placeNote(point) ?? false;
  }

  return Object.freeze({
    add: () => options.state.activeRun?.addNote(options.runView.noteText()),
    cancel: () => options.state.activeRun?.cancelNote(),
    handleMapClick,
    handleSample,
    manual: () => options.state.activeRun?.openNote("manual"),
    noteState: () => options.state.activeRun?.state.note ?? null,
    reset: () => { failurePrompted = false; },
  });
}

function mapPoint(event, currentZ) {
  const value = event?.lngLat ?? event;
  const lng = Number(value?.lng);
  const lat = Number(value?.lat);
  const z = Number(event?.zLevel ?? event?.z ?? currentZ);
  return [lng, lat, z].every(Number.isFinite) ? { lng, lat, z } : null;
}
