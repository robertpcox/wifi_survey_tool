// FEATURE:      Report Player private map access
// SURFACE:      renderMapAccess(result), bindMapAccess(options)
// WHY TOGETHER: Conditional prompt and memory-only public/private actions share one credential boundary.
// STATE:        In-memory credential store supplied by the app
// RULES:        Prompt only when meta requires access; decline always preserves the public map.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { esc } from "../../shared/format.mjs";

export function renderMapAccess(result) {
  if (!result.meta.credentialRequirements.mapAccess) return "";
  return `
    <aside class="map-access" data-map-access-panel>
      <div>
        <strong>Optional private campus map</strong>
        <span>Held in memory for this tab only. Public route overlays work without it.</span>
      </div>
      <div class="map-access-row">
        <input data-map-access type="password" autocomplete="off"
          aria-label="Private map access">
        <button type="button" class="primary" data-save-access>Use private map</button>
        <button type="button" data-clear-access>Continue with public map</button>
      </div>
      <p data-map-access-status></p>
    </aside>`;
}

export function bindMapAccess({ root, result, credentials, surface }) {
  if (!result.meta.credentialRequirements.mapAccess) return null;
  const input = root.querySelector("[data-map-access]");
  const status = root.querySelector("[data-map-access-status]");
  root.querySelector("[data-save-access]").addEventListener("click", async () => {
    credentials.set("mapAccess", input.value);
    input.value = "";
    if (!credentials.has("mapAccess")) {
      status.textContent = "Enter private map access or continue with the public map.";
      return;
    }
    status.textContent = "Loading private campus map…";
    try {
      await surface.usePrivate(credentials.read("mapAccess"));
      status.textContent = "Private campus map active for this tab.";
    } catch (error) {
      credentials.clear("mapAccess");
      surface.usePublic();
      status.innerHTML = `Private map unavailable: ${esc(error.message)}. Public map remains active.`;
    }
  });
  root.querySelector("[data-clear-access]").addEventListener("click", () => {
    credentials.clear("mapAccess");
    input.value = "";
    surface.usePublic();
    status.textContent = "Public map active with embedded route overlays.";
  });
  return Object.freeze({ credentials });
}
