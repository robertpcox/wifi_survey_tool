import { haversine } from "../../domain/geometry.mjs";

export function createRunnerRunView(documentRef) {
  const find = selector => documentRef.querySelector(selector);
  let activeState = null;
  let latestFix = null;
  const setText = (selector, value) => {
    const node = find(selector);
    if (node) node.textContent = String(value);
  };

  function renderRun(state) {
    activeState = state;
    const panel = find("[data-run-panel]");
    if (panel) panel.hidden = Boolean(state.completionStatus);
    if (state.completionStatus) return;
    const progress = state.progress;
    const checkpoint = progress.checkpoints[progress.currentIndex];
    setText(
      "[data-run-progress]",
      `${Math.min(progress.currentIndex + 1, progress.checkpoints.length)}`
        + ` of ${progress.checkpoints.length}`,
    );
    setText("[data-current-target]", targetName(checkpoint));
    setText("[data-current-floor]", checkpoint?.floorLabel ?? "—");
    renderTargetDistance();
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
    if (sample?.success && sample.normalized) latestFix = sample;
    setText("[data-poll-count]", count);
    setText("[data-poll-state]", sample.success ? "Live" : "Source error");
    const indicator = find("[data-poll-indicator]");
    if (indicator) indicator.dataset.state = sample.success ? "ok" : "error";
    setText(
      "[data-source-health]",
      sample.success ? `${sample.roundTripMs} ms` : sample.error,
    );
    renderTargetDistance();
  }

  function renderTargetDistance() {
    const progress = activeState?.progress;
    const checkpoint = progress?.checkpoints?.[progress.currentIndex];
    setText(
      "[data-target-distance]",
      checkpointDistanceText(latestFix, checkpoint),
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
  return checkpoint.label || `Checkpoint ${checkpoint.sequence + 1}`;
}

export function checkpointDistanceText(sample, checkpoint) {
  const fix = sample?.normalized;
  if (!fix || !checkpoint) return "Waiting for fix";
  if (Number.isFinite(fix.z) && Number.isFinite(checkpoint.z) && fix.z !== checkpoint.z) {
    return `Change to ${checkpoint.floorLabel || `Floor ${checkpoint.z}`}`;
  }
  return `≈ ${Math.round(haversine(fix, checkpoint))} m`;
}
