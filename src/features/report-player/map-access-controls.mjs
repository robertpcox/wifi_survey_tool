// FEATURE:      Report Player map-access controls
// SURFACE:      createMapAccessControls(options)
// WHY TOGETHER: Prompt visibility, focus, and launch-result copy share one UI boundary.
// STATE:        Panel expansion and dashboard-supplied concealment
// RULES:        A failed concealed attempt always restores a focused correction prompt.
// PROVENANCE:   Customer dashboard memory-only map access

import { esc } from "../../shared/format.mjs";

export function createMapAccessControls({
  root, requirePrivateAccess, preloaded, concealOnSuccess,
}) {
  const panel = root.querySelector("[data-map-access-panel]");
  const input = root.querySelector("[data-map-access]");
  const status = root.querySelector("[data-map-access-status]");
  const toggleButton = root.querySelector("[data-toggle-map-access]");
  const saveButton = root.querySelector("[data-save-access]");
  const clearButton = root.querySelector("[data-clear-access]");
  let conceal = concealOnSuccess;
  setAvailable(!conceal);
  setOpen(!preloaded && (requirePrivateAccess || !panel.hidden));

  function setAvailable(value) {
    if (toggleButton) toggleButton.hidden = !value;
  }

  function setOpen(value) {
    const expanded = Boolean(value);
    panel.hidden = !expanded;
    toggleButton?.setAttribute("aria-expanded", String(expanded));
    return expanded;
  }

  function open() {
    setAvailable(true);
    const expanded = setOpen(true);
    input.focus?.();
    return expanded;
  }

  function close(restoreFocus = false) {
    const expanded = setOpen(false);
    if (restoreFocus && !toggleButton?.hidden) toggleButton?.focus?.();
    return expanded;
  }

  function releaseConcealment() {
    conceal = false;
    setAvailable(true);
  }

  function handleLaunch(outcome, {
    restoreFocus = false, privateAttempt = false, revealFailure = false,
  } = {}) {
    if (requirePrivateAccess && !privateAttempt) {
      open();
      status.textContent = outcome?.status === "ready"
        ? "Public map active. Enter private access to load room and corridor polygons."
        : "Enter private access for area resolution; route fallback remains available.";
      return outcome;
    }
    if (outcome?.status === "ready") {
      close(!conceal && restoreFocus);
      status.textContent = "";
      if (conceal) setAvailable(false);
      return outcome;
    }
    releaseConcealment();
    if (outcome?.status === "access-denied") {
      open();
      status.textContent = "Enter MazeMap access or continue with the route fallback.";
    } else {
      if (revealFailure || (requirePrivateAccess && privateAttempt)) open();
      else close(restoreFocus);
      if (outcome?.error) {
        status.innerHTML = `MazeMap unavailable: ${esc(outcome.error.message)}.`;
      } else {
        status.textContent = revealFailure || privateAttempt
          ? "MazeMap access could not be applied. Enter access again or continue without area resolution."
          : "";
      }
    }
    return outcome;
  }

  return Object.freeze({
    clearButton,
    close,
    handleLaunch,
    input,
    open,
    releaseConcealment,
    saveButton,
    setBusy(value) {
      saveButton.disabled = value;
      clearButton.disabled = value;
    },
    status,
    toggle: () => panel.hidden ? open() : close(),
    toggleButton,
  });
}
