// FEATURE:      Report Player map access prompt
// SURFACE:      renderMapAccess(result, options)
// WHY TOGETHER: Required and optional credential copy share one memory-only form.
// STATE:        None
// RULES:        Never render, persist, or prefill a credential value.
// PROVENANCE:   Scope/steps/05a_recast_player.md

export function renderMapAccess(result, {
  requirePrivateAccess = false, accessPreloaded = false,
} = {}) {
  const hint = Boolean(result.meta.credentialRequirements.mapAccess);
  const hidden = accessPreloaded || !requirePrivateAccess;
  return `
    <aside id="report-map-access" class="map-access"
      data-map-access-panel data-access-hint="${hint}"
      data-access-required="${requirePrivateAccess}"${hidden ? " hidden" : ""}>
      <div>
        <strong>${requirePrivateAccess
    ? "MazeMap access required for area resolution"
    : "Optional MazeMap access token"}</strong>
        <span>${requirePrivateAccess
    ? "Room and corridor area scoring needs private level polygons. The map waits for access so those polygons are present from its first load."
    : "Enter a private access token when the public map does not show the required campus detail."}
          The token is held in memory for this tab only.</span>
      </div>
      <div class="map-access-row">
        <input data-map-access type="password" autocomplete="one-time-code"
          aria-label="${requirePrivateAccess ? "Required" : "Optional"} MazeMap access token"
          placeholder="Paste access token">
        <button type="button" class="primary" data-save-access>Load private map</button>
        <button type="button" data-clear-access>${requirePrivateAccess
    ? "Continue without area resolution" : "Use route fallback"}</button>
      </div>
      <p data-map-access-status role="status" aria-live="polite"></p>
    </aside>`;
}
