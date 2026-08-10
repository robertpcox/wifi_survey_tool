// FEATURE:      Report Player map access
// SURFACE:      renderMapAccess(result), bindMapAccess(options)
// WHY TOGETHER: Optional public retry and required private-area access share one credential boundary.
// STATE:        In-memory credential store supplied by the app
// RULES:        Required access gates the first map launch; optional access stays public-first.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { esc } from "../../shared/format.mjs";
export { renderMapAccess } from "./map-access-view.mjs";

export function bindMapAccess({
  root, credentials, surface, requirePrivateAccess = false,
  onReady = () => {}, onDecline = () => {},
}) {
  const panel = root.querySelector("[data-map-access-panel]");
  const input = root.querySelector("[data-map-access]");
  const status = root.querySelector("[data-map-access-status]");
  const toggleButton = root.querySelector("[data-toggle-map-access]");
  root.querySelector("[data-save-access]").addEventListener("click", retry);
  root.querySelector("[data-clear-access]").addEventListener("click", decline);
  toggleButton?.addEventListener("click", toggle);
  let accessReady = false;
  let declined = false;
  let settleInitial;
  let initialSettled = false;
  const initialReady = new Promise(resolve => { settleInitial = resolve; });
  setOpen(requirePrivateAccess || !panel.hidden);

  function settle(outcome) {
    if (initialSettled) return outcome;
    initialSettled = true;
    settleInitial(outcome);
    return outcome;
  }

  function setOpen(value) {
    const expanded = Boolean(value);
    panel.hidden = !expanded;
    toggleButton?.setAttribute("aria-expanded", String(expanded));
    return expanded;
  }

  function open() {
    const expanded = setOpen(true);
    input.focus?.();
    return expanded;
  }

  function close(restoreFocus = false) {
    const expanded = setOpen(false);
    if (restoreFocus) toggleButton?.focus?.();
    return expanded;
  }

  function toggle() {
    return panel.hidden ? open() : close();
  }

  async function retry() {
    declined = false;
    credentials.set("mapAccess", input.value);
    input.value = "";
    if (!credentials.has("mapAccess")) {
      status.textContent = requirePrivateAccess
        ? "Enter access or continue without area resolution."
        : "Enter access or use the labelled route fallback.";
      return;
    }
    status.textContent = "Retrying MazeMap…";
    try {
      const outcome = await surface.retryAccess(credentials.read("mapAccess"));
      accessReady = outcome?.status === "ready";
      handleLaunch(outcome, true, true);
      if (accessReady) {
        await onReady(outcome);
        settle(outcome);
      }
    } catch (error) {
      accessReady = false;
      credentials.clear("mapAccess");
      handleLaunch({ status: "fallback", error }, true, true);
    }
  }

  async function decline() {
    accessReady = false;
    declined = true;
    credentials.clear("mapAccess");
    input.value = "";
    close(true);
    if (requirePrivateAccess) {
      await onDecline();
      const outcome = await surface.start();
      handleLaunch(outcome, true);
      return settle(outcome);
    }
    return surface.declineAccess?.();
  }

  async function start() {
    if (requirePrivateAccess) {
      open();
      status.textContent =
        "Enter private MazeMap access before the campus map and area data are loaded.";
      return initialReady;
    }
    const outcome = await surface.start();
    handleLaunch(outcome);
    return outcome;
  }

  function handleLaunch(outcome, restoreFocus = false, privateAttempt = false) {
    if (!privateAttempt && (accessReady || declined)) return outcome;
    if (requirePrivateAccess && !privateAttempt) {
      open();
      status.textContent = outcome?.status === "ready"
        ? "Public map active. Enter private access to load room and corridor polygons."
        : "Enter private access for area resolution; route fallback remains available.";
      return outcome;
    }
    if (outcome?.status === "access-denied") {
      open();
      status.textContent = "Enter MazeMap access or continue with the route fallback.";
    } else if (outcome?.status === "ready") {
      close(restoreFocus);
      status.textContent = "";
    } else {
      if (requirePrivateAccess && privateAttempt) open();
      else close(restoreFocus);
      status.innerHTML = outcome?.error
        ? `MazeMap unavailable: ${esc(outcome.error.message)}.`
        : "";
    }
    return outcome;
  }

  return Object.freeze({
    credentials,
    close,
    decline,
    handleLaunch,
    open,
    retry,
    start,
    toggle,
    get accessReady() { return accessReady; },
    get declined() { return declined; },
  });
}
