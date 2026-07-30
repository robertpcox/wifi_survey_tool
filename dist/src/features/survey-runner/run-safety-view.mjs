// FEATURE:      Runner field-safety controls
// SURFACE:      createRunnerSafetyView(documentRef)
// WHY TOGETHER: Back, closed-area Skip, and destructive Stop confirmation share one HUD state.
// STATE:        Native Stop dialog open state
// RULES:        Stop cannot end polling until explicitly confirmed.
// PROVENANCE:   Android field safety feedback

export function createRunnerSafetyView(documentRef) {
  const find = selector => documentRef.querySelector(selector);
  const dialog = find("[data-stop-dialog]");

  function closeStopWarning() {
    if (dialog?.open && typeof dialog.close === "function") dialog.close();
    else if (dialog) dialog.hidden = true;
  }

  function openStopWarning() {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.hidden = false;
    find('[data-action="cancel-stop"]')?.focus?.();
  }

  function render(state) {
    const progress = state.progress;
    const noteOpen = Boolean(state.note);
    const awaitingEnd = progress.phase === "awaiting-end";
    const history = progress.history ?? [];
    const back = find('[data-action="back-checkpoint"]');
    const skip = find('[data-action="skip-checkpoint"]');
    const stop = find('[data-action="stop"]');
    if (back) back.disabled = noteOpen || !history.length;
    if (skip) {
      const last = progress.currentIndex >= progress.checkpoints.length - 1;
      skip.disabled = noteOpen || progress.phase !== "walking"
        || (last && !progress.checkIns?.length);
      skip.hidden = awaitingEnd;
    }
    if (stop) {
      stop.hidden = awaitingEnd;
      stop.disabled = noteOpen;
    }
    if (awaitingEnd || state.completionStatus) closeStopWarning();
  }

  return Object.freeze({
    bind(handlers) {
      find('[data-action="back-checkpoint"]')?.addEventListener("click", handlers.back);
      find('[data-action="skip-checkpoint"]')?.addEventListener("click", handlers.skip);
      find('[data-action="stop"]')?.addEventListener("click", openStopWarning);
      find('[data-action="cancel-stop"]')?.addEventListener("click", closeStopWarning);
      find('[data-action="confirm-stop"]')?.addEventListener("click", () => {
        closeStopWarning();
        handlers.stop();
      });
      dialog?.addEventListener("cancel", closeStopWarning);
    },
    hide: closeStopWarning,
    render,
  });
}

export function awaitingEndText(progress) {
  return progress.history?.at(-1)?.outcome === "skipped"
    ? "Route sequence complete · polling continues until you end the session"
    : "At endpoint · polling continues until you end the session";
}
