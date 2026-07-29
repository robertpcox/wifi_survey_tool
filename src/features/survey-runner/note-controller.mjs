// FEATURE:      Runner note orchestration
// SURFACE:      createRunnerNoteController(options)
// WHY TOGETHER: First-failure prompting, manual actions, and armed map clicks share one controller.
// STATE:        Whether this run already prompted for its first source failure
// RULES:        Failed capture prompts once; map clicks are ignored unless placement is armed.
// PROVENANCE:   Runner offline field feedback

import { RUNNER_NOTES_ENABLED } from "./feature-flags.mjs";

export function createRunnerNoteController(options) {
  let failurePrompted = false;
  const enabled = options.enabled ?? RUNNER_NOTES_ENABLED;

  function handleSample(sample, context) {
    if (!enabled || context !== "capture" || sample?.success || failurePrompted) return;
    const run = options.state.activeRun;
    if (!run || run.state.completionStatus) return;
    failurePrompted = true;
    run.openNote("source-failure", sample?.error);
  }

  function handleMapClick(event) {
    if (!enabled || !options.runView.placementArmed?.()) return false;
    const point = mapPoint(event, options.mapAdapter.currentZLevel);
    return options.state.activeRun?.placeNote(point) ?? false;
  }

  return Object.freeze({
    add: () => enabled
      ? options.state.activeRun?.addNote(options.runView.noteText())
      : undefined,
    cancel: () => enabled ? options.state.activeRun?.cancelNote() : undefined,
    handleMapClick,
    handleSample,
    manual: () => enabled ? options.state.activeRun?.openNote("manual") : undefined,
    noteState: () => enabled ? options.state.activeRun?.state.note ?? null : null,
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
