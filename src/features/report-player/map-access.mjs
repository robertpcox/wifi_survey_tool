// FEATURE:      Report Player map access
// SURFACE:      renderMapAccess(result), bindMapAccess(options)
// WHY TOGETHER: Optional public retry and required private-area access share one credential boundary.
// STATE:        In-memory credential store supplied by the app
// RULES:        Preloaded access launches privately first; direct optional access stays public-first.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { createMapAccessAttempt } from "./map-access-attempt.mjs";
import { createMapAccessControls } from "./map-access-controls.mjs";
export { renderMapAccess } from "./map-access-view.mjs";

export function bindMapAccess({
  root, credentials, surface, requirePrivateAccess = false,
  onReady = () => {}, onDecline = () => {},
}) {
  const preloaded = credentials.has("mapAccess");
  let declined = false;
  let settleInitial;
  let initialSettled = false;
  let startWork = null;
  const initialReady = new Promise(resolve => { settleInitial = resolve; });
  const controls = createMapAccessControls({
    root, requirePrivateAccess, preloaded,
    concealOnSuccess: preloaded,
  });
  const attempts = createMapAccessAttempt({
    credentials, surface, onReady,
    onBusy: controls.setBusy,
    onLaunch(outcome, options) {
      handleLaunch(outcome, options.restoreFocus, true, options.revealFailure);
    },
  });
  controls.saveButton.addEventListener("click", retry);
  controls.clearButton.addEventListener("click", decline);
  controls.toggleButton?.addEventListener("click", controls.toggle);

  function settle(outcome) {
    if (initialSettled) return outcome;
    initialSettled = true;
    settleInitial(outcome);
    return outcome;
  }

  async function retry() {
    declined = false;
    const entered = controls.input.value;
    controls.input.value = "";
    controls.status.textContent = "Retrying MazeMap…";
    const outcome = await attempts.run(entered, { restoreFocus: true });
    if (!outcome) {
      controls.status.textContent = requirePrivateAccess
        ? "Enter access or continue without area resolution."
        : "Enter access or use the labelled route fallback.";
      return null;
    }
    if (attempts.ready) settle(outcome);
    return outcome;
  }

  async function decline() {
    await attempts.wait();
    attempts.reset();
    declined = true;
    controls.releaseConcealment();
    credentials.clear("mapAccess");
    controls.input.value = "";
    controls.close(true);
    if (requirePrivateAccess) {
      await onDecline();
      const outcome = await surface.start();
      handleLaunch(outcome, true);
      return settle(outcome);
    }
    return surface.declineAccess?.();
  }

  function start() {
    return startWork ??= beginStart();
  }

  async function beginStart() {
    if (credentials.has("mapAccess")) {
      const outcome = await attempts.run(credentials.read("mapAccess"), {
        revealFailure: true,
      });
      if (attempts.ready) settle(outcome);
      return requirePrivateAccess ? initialReady : outcome;
    }
    controls.releaseConcealment();
    if (requirePrivateAccess) {
      controls.open();
      controls.status.textContent =
        "Enter private MazeMap access before the campus map and area data are loaded.";
      return initialReady;
    }
    const outcome = await surface.start();
    handleLaunch(outcome);
    return outcome;
  }

  function handleLaunch(outcome, restoreFocus = false, privateAttempt = false,
    revealFailure = false) {
    if (!privateAttempt && (attempts.ready || declined)) return outcome;
    return controls.handleLaunch(outcome, {
      restoreFocus, privateAttempt, revealFailure,
    });
  }

  return Object.freeze({
    credentials, decline, handleLaunch, retry, start,
    close: controls.close, open: controls.open, toggle: controls.toggle,
    get accessReady() { return attempts.ready; },
    get declined() { return declined; },
  });
}
