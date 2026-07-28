export function createRunnerRunView(documentRef) {
  const find = selector => documentRef.querySelector(selector);
  const setText = (selector, value) => {
    const node = find(selector);
    if (node) node.textContent = String(value);
  };

  function renderRun(state) {
    const panel = find("[data-run-panel]");
    if (panel) panel.hidden = false;
    const progress = state.progress;
    const checkpoint = progress.checkpoints[progress.currentIndex];
    setText(
      "[data-run-progress]",
      `${Math.min(progress.currentIndex + 1, progress.checkpoints.length)}`
        + ` of ${progress.checkpoints.length}`,
    );
    setText("[data-current-target]", targetName(checkpoint));
    setText("[data-current-floor]", checkpoint ? `Floor ${checkpoint.z}` : "—");
    setText(
      "[data-dwell-countdown]",
      progress.phase === "dwelling"
        ? `${progress.dwellRemainingSeconds} s dwell`
        : "Ready to check in",
    );
    const checkIn = find('[data-action="check-in"]');
    if (checkIn) checkIn.disabled = progress.phase !== "walking";
  }

  function renderSource(sample, count) {
    setText("[data-poll-count]", count);
    setText("[data-poll-state]", sample.success ? "Receiving fixes" : "Source error");
    setText(
      "[data-source-health]",
      sample.success ? `${sample.roundTripMs} ms` : sample.error,
    );
  }

  function showFinish(status) {
    const run = find("[data-run-panel]");
    const finish = find("[data-finish-panel]");
    if (run) run.hidden = true;
    if (finish) finish.hidden = false;
    setText(
      "[data-finish-status]",
      status === "completed"
        ? "Survey completed. Download the result."
        : "Survey stopped early. Download the aborted result.",
    );
  }

  return Object.freeze({
    bind(handlers) {
      find('[data-action="check-in"]')?.addEventListener("click", handlers.checkIn);
      find('[data-action="stop"]')?.addEventListener("click", handlers.stop);
      find('[data-action="download-result"]')?.addEventListener("click", handlers.download);
      find("[data-result-file]")?.addEventListener("change", handlers.validateFile);
    },
    comment: () => find("[data-operator-comment]")?.value ?? "",
    renderRun,
    renderSource,
    showFinish,
    showValidation(result) {
      const output = find("[data-validation-result]");
      if (!output) return;
      output.dataset.valid = String(result.valid);
      output.textContent = result.message;
    },
  });
}

export function targetName(checkpoint) {
  if (!checkpoint) return "No target";
  if (checkpoint.type === "stop") return `Stop: ${checkpoint.stopId}`;
  return `Route checkpoint ${checkpoint.sequence + 1}`;
}
