// FEATURE:      Dashboard map access handoff
// SURFACE:      renderDashboardMapAccess(), bindDashboardMapAccess(options)
// WHY TOGETHER: One memory-only form controls private access for every dashboard report launch.
// STATE:        In-memory map access and short-lived child report registrations
// RULES:        Never put access in markup, URLs, or storage; tokenless links remain native.
// PROVENANCE:   Customer dashboard report launch

import { createWindowMapAccessSender } from "../../adapters/window-map-access-transfer.mjs";

export function renderDashboardMapAccess() {
  return `<section class="dashboard-map-access" aria-labelledby="map-access-title">
    <div>
      <p class="dashboard-kicker">Map access</p>
      <h2 id="map-access-title">Private MazeMap access</h2>
      <p id="map-access-help">Enter access once for reports opened from this dashboard.
        Reports open in a new tab while it is set. Access is passed directly in memory,
        never added to the URL or saved, and accepted reports hide their access controls.</p>
    </div>
    <form data-dashboard-map-access-form>
      <label for="dashboard-map-access">MazeMap access token</label>
      <div class="dashboard-map-access-row">
        <input id="dashboard-map-access" data-dashboard-map-access type="password"
          autocomplete="one-time-code" spellcheck="false" aria-describedby="map-access-help"
          placeholder="Paste access token" data-1p-ignore data-lpignore="true" data-bwignore>
        <button type="submit" class="primary">Use for reports</button>
        <button type="button" data-clear-dashboard-map-access disabled>Clear</button>
      </div>
      <p data-dashboard-map-access-status role="status" aria-live="polite">
        No private map access set.</p>
    </form>
  </section>`;
}

export function bindDashboardMapAccess({
  root, credentials, windowRef, sender,
}) {
  const form = root.querySelector?.("[data-dashboard-map-access-form]");
  if (!form) return noBinding();
  const input = root.querySelector("[data-dashboard-map-access]");
  const clear = root.querySelector("[data-clear-dashboard-map-access]");
  const status = root.querySelector("[data-dashboard-map-access-status]");
  const transfer = sender ?? createWindowMapAccessSender({
    windowRef,
    readAccess: () => credentials.read("mapAccess"),
  });

  function sync(message) {
    const ready = credentials.has("mapAccess");
    clear.disabled = !ready;
    status.textContent = message ?? (ready
      ? "Private map access is ready for report launches."
      : "No private map access set.");
  }

  function save(event) {
    event?.preventDefault?.();
    const entered = String(input.value ?? "").trim();
    input.value = "";
    if (!entered) {
      sync("Enter a MazeMap access token first.");
      input.focus?.();
      return;
    }
    credentials.set("mapAccess", entered);
    sync();
  }

  function clearAccess() {
    credentials.clear("mapAccess");
    input.value = "";
    sync("Private map access cleared.");
    input.focus?.();
  }

  function launch(event) {
    if (!credentials.has("mapAccess") || event.defaultPrevented
        || (event.button != null && event.button !== 0)) return;
    event.preventDefault();
    const href = event.currentTarget.href;
    if (transfer.open(href)) {
      sync("Opening report with private map access…");
      return;
    }
    sync("Pop-up blocked. Opening this report in the current tab without access handoff.");
    windowRef.location.assign(href);
  }

  form.addEventListener("submit", save);
  clear.addEventListener("click", clearAccess);
  const links = [...root.querySelectorAll("[data-report-launch]")];
  links.forEach(link => link.addEventListener("click", launch));
  sync();
  return Object.freeze({
    destroy() {
      form.removeEventListener?.("submit", save);
      clear.removeEventListener?.("click", clearAccess);
      links.forEach(link => link.removeEventListener?.("click", launch));
      transfer.destroy?.();
    },
  });
}

function noBinding() {
  return Object.freeze({ destroy() {} });
}
