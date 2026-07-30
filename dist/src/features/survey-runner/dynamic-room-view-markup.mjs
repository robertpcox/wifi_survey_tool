// FEATURE:      Dynamic room Runner view support
// SURFACE:      Selectors, injected markup, phase copy, and dwell/mark button labels
// WHY TOGETHER: Static injected markup and phase copy keep the DOM adapter compact.
// STATE:        Dynamic capture phase, route error, and paired-export readiness
// RULES:        Finalisation errors remain visible while polling continues.
// PROVENANCE:   Ad-hoc room survey field workflow

export const DYNAMIC_ROOM_SELECTORS = Object.freeze({
  panel: "[data-dynamic-room-panel]",
  status: "[data-dynamic-room-status]",
  dwellRemaining: "[data-dynamic-room-dwell]",
  exports: "[data-dynamic-room-exports]",
  checkIn: '[data-action="dynamic-check-in"]',
  dwell: '[data-action="dynamic-dwell"]',
  extendDwell: '[data-action="dynamic-extend-dwell"]',
  passMark: '[data-action="dynamic-pass-mark"]',
  skipMark: '[data-action="dynamic-skip-mark"]',
  finish: '[data-action="dynamic-finish"]',
  back: '[data-action="back-checkpoint"]',
  retry: '[data-action="dynamic-retry"]',
  downloadDefinition: '[data-action="dynamic-download-definition"]',
  downloadResult: '[data-action="dynamic-download-result"]',
  clear: '[data-action="dynamic-clear"]',
  stop: '[data-action="stop"]',
  stopDialog: "[data-stop-dialog]",
});

export function dynamicRoomDwellLabel(seconds) {
  const dwell = Number(seconds);
  return `Dwell here for ${Number.isFinite(dwell) && dwell > 0 ? dwell : 45}s`;
}

export function dynamicRoomMarkLabel(marks) {
  return `Passed mark ${Number(marks?.consumed) + 1} of ${Number(marks?.total)}`;
}

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
      ? "Walk on — tap each mark as you pass it, then check in at the checkpoint."
      : "Checkpoint placed. Choose a check-in.";
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
      <strong data-dynamic-room-dwell aria-live="polite" aria-atomic="true" hidden></strong>
      <div class="dynamic-room-actions">
        <button type="button" data-action="dynamic-check-in">Check in &amp; keep walking</button>
        <button type="button" data-action="dynamic-dwell">Dwell here for 45s</button>
        <button type="button" data-action="dynamic-extend-dwell" hidden>+10 seconds</button>
        <button type="button" data-action="dynamic-pass-mark" hidden>Passed mark</button>
        <button type="button" data-action="dynamic-skip-mark" hidden>Skip missed mark</button>
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
