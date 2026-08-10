// FEATURE:      Report Player map access
// SURFACE:      renderMapAccess(result), bindMapAccess(options)
// WHY TOGETHER: Optional public retry and required private-area access share one credential boundary.
// STATE:        In-memory credential store supplied by the app
// RULES:        Area scoring gates proactively; optional access still opens only on proved denial.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { esc } from "../../shared/format.mjs";

export function renderMapAccess(result, { requirePrivateAccess = false } = {}) {
  const hint = Boolean(result.meta.credentialRequirements.mapAccess);
  return `
    <aside id="report-map-access" class="map-access"
      data-map-access-panel data-access-hint="${hint}"
      data-access-required="${requirePrivateAccess}"${requirePrivateAccess ? "" : " hidden"}>
      <div>
        <strong>${requirePrivateAccess
    ? "MazeMap access required for area resolution"
    : "Optional MazeMap access token"}</strong>
        <span>${requirePrivateAccess
    ? "Room and corridor area scoring needs private level polygons. Public map and route evidence can load without them."
    : "Enter a private access token when the public map does not show the required campus detail."}
          The token is held in memory for this tab only.</span>
      </div>
      <div class="map-access-row">
        <input data-map-access type="password" autocomplete="one-time-code"
          aria-label="${requirePrivateAccess ? "Required" : "Optional"} MazeMap access token"
          placeholder="Paste access token">
        <button type="button" class="primary" data-save-access>Apply access token</button>
        <button type="button" data-clear-access>${requirePrivateAccess
    ? "Continue without area resolution" : "Use route fallback"}</button>
      </div>
      <p data-map-access-status role="status" aria-live="polite"></p>
    </aside>`;
}

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
  setOpen(requirePrivateAccess || !panel.hidden);

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
      if (accessReady) await onReady(outcome);
    } catch (error) {
      accessReady = false;
      credentials.clear("mapAccess");
      handleLaunch({ status: "fallback", error }, true, true);
    }
  }

  function decline() {
    accessReady = false;
    declined = true;
    credentials.clear("mapAccess");
    input.value = "";
    close(true);
    if (requirePrivateAccess) onDecline();
    else surface.declineAccess?.();
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
    toggle,
    get accessReady() { return accessReady; },
    get declined() { return declined; },
  });
}
