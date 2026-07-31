// FEATURE:      Dynamic room Runner view support
// SURFACE:      Selectors, injected markup, and phase copy
// WHY TOGETHER: Static injected markup and phase copy keep the DOM adapter compact.
// STATE:        Dynamic capture phase, route error, and paired-export readiness
// RULES:        Walking presentation lives on the shared run HUD; this panel guides and finalises.
// PROVENANCE:   Ad-hoc room survey field workflow

export const DYNAMIC_ROOM_SELECTORS = Object.freeze({
  panel: "[data-dynamic-room-panel]",
  status: "[data-dynamic-room-status]",
  exports: "[data-dynamic-room-exports]",
  checkIn: '[data-action="check-in"]',
  continueDwell: '[data-action="dynamic-continue-dwell"]',
  extendDwell: '[data-action="dynamic-extend-dwell"]',
  skip: '[data-action="skip-checkpoint"]',
  finish: '[data-action="dynamic-finish"]',
  back: '[data-action="back-checkpoint"]',
  retry: '[data-action="dynamic-retry"]',
  downloadDefinition: '[data-action="dynamic-download-definition"]',
  downloadResult: '[data-action="dynamic-download-result"]',
  clear: '[data-action="dynamic-clear"]',
  stop: '[data-action="stop"]',
  stopDialog: "[data-stop-dialog]",
});

export function dynamicRoomStatusText(state = {}) {
  const phase = state.phase ?? "tap-point";
  const error = state.error instanceof Error ? state.error.message : state.error;
  if (error && !["finalising", "completed"].includes(phase)) {
    return `${error} Tap the map again.`;
  }
  if (phase === "tap-point") return "Tap the map to place the first checkpoint.";
  if (phase === "walking") return "Walking — tap the map to place the next checkpoint.";
  if (phase === "pending") {
    return state.marks?.remaining > 0
      ? "Walk on — check in at each mark, then at the checkpoint."
      : "Walk to the checkpoint and check in on arrival.";
  }
  if (phase === "dwelling") {
    return state.staged
      ? "Next checkpoint staged. Stay here while the blue dot settles."
      : "Stay here while the blue dot settles. Tap the map to stage the next checkpoint.";
  }
  if (phase === "finalising") {
    return error
      ? `${error} ${state.polling === false
        ? "Polling has stopped."
        : "Polling continues."} Retry route finalisation.`
      : "Finalising route — remain at the final checkpoint. Polling continues.";
  }
  if (error) return error;
  return state.exportReady
    ? "Survey definition and result are ready to download."
    : "Preparing the survey definition and result…";
}

export function ensureDynamicRoomMarkup(find, panelSelector) {
  if (find(panelSelector)) return;
  find("[data-run-panel]")?.insertAdjacentHTML("beforeend", `
    <section class="dynamic-room-panel" data-dynamic-room-panel
      aria-labelledby="dynamic-room-title" aria-busy="false" hidden>
      <h2 id="dynamic-room-title">Dynamic room survey</h2>
      <p data-dynamic-room-status role="status" aria-live="polite" aria-atomic="true"></p>
      <div class="dynamic-room-actions">
        <button type="button" data-action="dynamic-continue-dwell" hidden>Continue — dot has settled</button>
        <button type="button" data-action="dynamic-extend-dwell" hidden>+10 seconds</button>
        <button type="button" data-action="dynamic-finish" hidden>Finish survey</button>
        <button type="button" data-action="dynamic-retry" hidden>Retry route finalisation</button>
      </div>
      <div class="dynamic-room-exports" data-dynamic-room-exports hidden>
        <button type="button" data-action="dynamic-download-definition">Download survey</button>
        <button type="button" data-action="dynamic-download-result">Download result</button>
        <button type="button" data-action="dynamic-clear">Clear capture</button>
      </div>
    </section>`);
}
