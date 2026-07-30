import { haversine } from "../../domain/geometry.mjs";
import { createRunnerNoteView } from "./note-view.mjs";
import { awaitingEndText, createRunnerSafetyView } from "./run-safety-view.mjs";

export function createRunnerRunView(documentRef) {
  const find = selector => documentRef.querySelector(selector);
  let activeState = null;
  let latestFix = null;
  const noteView = createRunnerNoteView(documentRef);
  const safetyView = createRunnerSafetyView(documentRef);
  const setText = (selector, value) => {
    const node = find(selector);
    if (node) node.textContent = String(value);
  };

  function renderRun(state) {
    activeState = state;
    noteView.render(state.note);
    const panel = find("[data-run-panel]");
    if (panel) panel.hidden = Boolean(state.completionStatus);
    if (state.completionStatus) return;
    const progress = state.progress;
    const checkpoint = progress.checkpoints[progress.currentIndex];
    safetyView.render(state);
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
        : progress.phase === "awaiting-end"
          ? awaitingEndText(progress)
          : "Ready to check in",
    );
    const checkIn = find('[data-action="check-in"]');
    const endSession = find('[data-action="end-session"]');
    const awaitingEnd = progress.phase === "awaiting-end";
    const noteOpen = Boolean(state.note);
    if (checkIn) {
      checkIn.disabled = progress.phase !== "walking" || noteOpen;
      checkIn.hidden = awaitingEnd;
    }
    if (endSession) {
      endSession.hidden = !awaitingEnd;
      endSession.disabled = noteOpen;
    }
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
    safetyView.hide();
    const run = find("[data-run-panel]");
    const finish = find("[data-finish-panel]");
    const setup = find("[data-setup-controls]");
    if (run) run.hidden = true;
    if (finish) finish.hidden = false;
    if (setup) setup.hidden = true;
    setText(
      "[data-finish-status]",
      status === "completed"
        ? "Survey completed. Download the result."
        : "Survey stopped early. Download the aborted result.",
    );
  }

  function resetSession() {
    safetyView.hide();
    activeState = null;
    latestFix = null;
    const run = find("[data-run-panel]");
    const finish = find("[data-finish-panel]");
    const setup = find("[data-setup-controls]");
    if (run) run.hidden = true;
    if (finish) finish.hidden = true;
    if (setup) setup.hidden = false;
    const comment = find("[data-operator-comment]");
    if (comment) comment.value = "";
    setText("[data-poll-count]", 0);
    setText("[data-poll-state]", "Starting");
    setText("[data-source-health]", "—");
    setText("[data-target-distance]", "Waiting for fix");
  }

  return Object.freeze({
    bind(handlers) {
      noteView.bind(handlers);
      safetyView.bind(handlers);
      find('[data-action="check-in"]')?.addEventListener("click", handlers.checkIn);
      find('[data-action="end-session"]')?.addEventListener("click", handlers.endSession);
      find('[data-action="download-result"]')?.addEventListener("click", handlers.download);
      find('[data-action="clear-capture"]')?.addEventListener("click", handlers.clearCapture);
      find("[data-result-file]")?.addEventListener("change", handlers.validateFile);
    },
    comment: () => find("[data-operator-comment]")?.value ?? "",
    noteText: noteView.noteText,
    placementArmed: noteView.placementArmed,
    renderRun,
    renderSource,
    resetSession,
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
