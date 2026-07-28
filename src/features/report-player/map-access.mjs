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
    <aside class="map-access" data-map-access-panel data-access-hint="${hint}" hidden>
      <div>
        <strong>Campus map access required</strong>
        <span>MazeMap denied the public request. Access is held in memory for this tab only.</span>
      </div>
      <div class="map-access-row">
        <input data-map-access type="password" autocomplete="off"
          aria-label="MazeMap access">
        <button type="button" class="primary" data-save-access>Retry MazeMap</button>
        <button type="button" data-clear-access>Use route fallback</button>
      </div>
      <p data-map-access-status></p>
    </aside>`;
}

export function bindMapAccess({ root, credentials, surface }) {
  const panel = root.querySelector("[data-map-access-panel]");
  const input = root.querySelector("[data-map-access]");
  const status = root.querySelector("[data-map-access-status]");
  root.querySelector("[data-save-access]").addEventListener("click", retry);
  root.querySelector("[data-clear-access]").addEventListener("click", decline);

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
      handleLaunch(outcome);
    } catch (error) {
      credentials.clear("mapAccess");
      handleLaunch({ status: "fallback", error });
    }
  }

  function decline() {
    credentials.clear("mapAccess");
    input.value = "";
    panel.hidden = true;
    surface.declineAccess?.();
  }

  function handleLaunch(outcome) {
    if (outcome?.status === "access-denied") {
      panel.hidden = false;
      status.textContent = "Enter MazeMap access or continue with the route fallback.";
    } else if (outcome?.status === "ready") {
      panel.hidden = true;
      status.textContent = "";
    } else {
      panel.hidden = true;
      status.innerHTML = outcome?.error
        ? `MazeMap unavailable: ${esc(outcome.error.message)}.`
        : "";
    }
    return outcome;
  }

  return Object.freeze({ credentials, decline, handleLaunch, retry });
}
