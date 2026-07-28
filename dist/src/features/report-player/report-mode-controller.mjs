// FEATURE:      Merged Report Player modes
// SURFACE:      bindReportModes(options)
// WHY TOGETHER: Tab state, Player lifecycle, scroll restoration, map layers, and seek API switch atomically.
// STATE:        Active mode and saved Report scroll position
// RULES:        Leaving Player pauses before hiding and disables its map layers without clearing its clock.
// PROVENANCE:   Scope/steps/05a_recast_player.md

export function bindReportModes({
  root,
  store,
  surface,
  player,
  windowRef = root.ownerDocument?.defaultView,
}) {
  let mode = store.snapshot().view ?? "analysis";
  let reportScrollY = 0;
  const unsubscribe = surface.onEvidenceSelect(event => {
    if (mode === "playback" && event?.pollId) player.focusEvidence(event.pollId, "map");
  });
  root.querySelectorAll("[data-report-view]").forEach(button => {
    button.addEventListener("click", () => setMode(button.dataset.reportView));
  });

  function setMode(next, options = {}) {
    if (!["analysis", "playback"].includes(next)) {
      throw new TypeError("Report Player mode must be analysis or playback");
    }
    if (next === "playback") enterPlayer();
    else leavePlayer();
    if (Number.isFinite(options.atMs)) player.seek(options.atMs);
    if (options.pollId) player.focusEvidence(options.pollId);
    return mode;
  }

  function enterPlayer() {
    if (mode !== "playback") reportScrollY = windowRef?.scrollY ?? 0;
    mode = "playback";
    store.setView(mode);
    updateMarkup();
    surface.setViewMode(mode);
    player.setActive(true);
    surface.settleLayout();
  }

  function leavePlayer() {
    player.setActive(false);
    surface.setViewMode("analysis");
    mode = "analysis";
    store.setView(mode);
    updateMarkup();
    surface.settleLayout().then(() => windowRef?.scrollTo?.(0, reportScrollY));
  }

  function updateMarkup() {
    root.querySelectorAll("[data-report-view]").forEach(button => {
      button.setAttribute("aria-selected", String(button.dataset.reportView === mode));
    });
    root.querySelectorAll("[data-report-pane]").forEach(pane => {
      pane.hidden = pane.dataset.reportPane !== mode;
    });
    root.querySelector("[data-report-context=analysis]").hidden = mode !== "analysis";
    root.classList.toggle("is-player", mode === "playback");
    root.ownerDocument?.body?.classList.toggle("player-active", mode === "playback");
  }

  function seek(atMs) {
    if (mode !== "playback") setMode("playback");
    return player.seek(atMs);
  }

  function destroy() {
    player.destroy();
    unsubscribe();
    root.ownerDocument?.body?.classList.remove("player-active");
  }

  updateMarkup();
  return Object.freeze({
    destroy,
    focusEvidence(id) {
      if (mode !== "playback") setMode("playback");
      return player.focusEvidence(id);
    },
    seek,
    setMode,
    get atMs() { return player.atMs; },
    get mode() { return mode; },
  });
}
