// FEATURE:      Runner map 3D display control
// SURFACE:      mountRunnerMap3dToggle(documentRef, mapAdapter)
// WHY TOGETHER: Accessible state, SDK fallback, and map-card injection form one control.
// STATE:        Current requested 3D display mode
// RULES:        State changes only after the adapter confirms the SDK operation.
// PROVENANCE:   Runner field map display control

export function mountRunnerMap3dToggle(documentRef, mapAdapter) {
  const button = ensureButton(documentRef);
  let enabled = typeof mapAdapter?.threeDEnabled === "boolean"
    ? mapAdapter.threeDEnabled
    : button?.getAttribute?.("aria-pressed") !== "false";

  function render() {
    if (!button) return;
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", `Turn 3D map ${enabled ? "off" : "on"}`);
    button.textContent = `3D map: ${enabled ? "on" : "off"}`;
  }

  function markUnavailable() {
    if (!button) return;
    if (typeof mapAdapter?.threeDEnabled === "boolean") {
      enabled = mapAdapter.threeDEnabled;
    }
    button.disabled = true;
    button.dataset.available = "false";
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute(
      "aria-label",
      `3D map unavailable; currently ${enabled ? "on" : "off"}`,
    );
    button.textContent = `3D unavailable (${enabled ? "on" : "off"})`;
  }

  function toggle() {
    if (!button) return false;
    const next = !enabled;
    let changed = false;
    try {
      changed = mapAdapter?.set3dEnabled?.(next) === true;
    } catch {}
    if (!changed) {
      if (mapAdapter?.ready) markUnavailable();
      return false;
    }
    enabled = next;
    render();
    return true;
  }

  button?.addEventListener?.("click", toggle);
  render();
  return Object.freeze({
    button,
    get enabled() { return enabled; },
    toggle,
  });
}

function ensureButton(documentRef) {
  let button = documentRef?.querySelector?.('[data-action="toggle-3d"]');
  if (button) return button;
  documentRef?.querySelector?.(".map-card")?.insertAdjacentHTML?.("afterbegin", `
    <div class="map-display-controls" role="group" aria-label="Map display controls">
      <button class="map-3d-toggle" type="button" data-action="toggle-3d"
        aria-pressed="true">3D map: on</button>
    </div>`);
  button = documentRef?.querySelector?.('[data-action="toggle-3d"]');
  return button ?? null;
}
