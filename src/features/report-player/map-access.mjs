// FEATURE:      Report Player public-first map access
// SURFACE:      renderMapAccess(result), bindMapAccess(options)
// WHY TOGETHER: A proved access denial and its memory-only retry share one credential boundary.
// STATE:        In-memory credential store supplied by the app
// RULES:        Metadata is only a hint; generic, SDK, network, and unknown failures never prompt.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { esc } from "../../shared/format.mjs";

export function renderMapAccess(result) {
  const hint = Boolean(result.meta.credentialRequirements.mapAccess);
  return `
    <aside id="report-map-access" class="map-access"
      data-map-access-panel data-access-hint="${hint}" hidden>
      <div>
        <strong>Optional MazeMap access token</strong>
        <span>Enter a private access token when the public map does not show the required
          campus detail. The token is held in memory for this tab only.</span>
      </div>
      <div class="map-access-row">
        <input data-map-access type="password" autocomplete="one-time-code"
          aria-label="Optional MazeMap access token" placeholder="Paste access token">
        <button type="button" class="primary" data-save-access>Apply access token</button>
        <button type="button" data-clear-access>Use route fallback</button>
      </div>
      <p data-map-access-status role="status" aria-live="polite"></p>
    </aside>`;
}

export function bindMapAccess({ root, credentials, surface }) {
  const panel = root.querySelector("[data-map-access-panel]");
  const input = root.querySelector("[data-map-access]");
  const status = root.querySelector("[data-map-access-status]");
  const toggleButton = root.querySelector("[data-toggle-map-access]");
  root.querySelector("[data-save-access]").addEventListener("click", retry);
  root.querySelector("[data-clear-access]").addEventListener("click", decline);
  toggleButton?.addEventListener("click", toggle);
  setOpen(!panel.hidden);

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
    credentials.set("mapAccess", input.value);
    input.value = "";
    if (!credentials.has("mapAccess")) {
      status.textContent = "Enter access or use the labelled route fallback.";
      return;
    }
    status.textContent = "Retrying MazeMap…";
    try {
      const outcome = await surface.retryAccess(credentials.read("mapAccess"));
      handleLaunch(outcome, true);
    } catch (error) {
      credentials.clear("mapAccess");
      handleLaunch({ status: "fallback", error }, true);
    }
  }

  function decline() {
    credentials.clear("mapAccess");
    input.value = "";
    close(true);
    surface.declineAccess?.();
  }

  function handleLaunch(outcome, restoreFocus = false) {
    if (outcome?.status === "access-denied") {
      open();
      status.textContent = "Enter MazeMap access or continue with the route fallback.";
    } else if (outcome?.status === "ready") {
      close(restoreFocus);
      status.textContent = "";
    } else {
      close(restoreFocus);
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
  });
}
