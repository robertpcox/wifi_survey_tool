// FEATURE:      Merged Report Player modes
// SURFACE:      bindReportModes(options)
// WHY TOGETHER: Tab state, Player lifecycle, scroll restoration, map layers, and seek API switch atomically.
// STATE:        Active mode and saved Report scroll position
// RULES:        Leaving Player pauses before hiding; overview reuses the analysis map layers.
// PROVENANCE:   Scope/steps/05a_recast_player.md

const MODES = ["analysis", "playback", "overview"];

export function bindReportModes({
  root,
  store,
  surface,
  player,
  onModeChange = () => {},
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
    if (!MODES.includes(next)) {
      throw new TypeError("Report Player mode must be analysis, playback, or overview");
    }
    if (next === "playback") enterPlayer();
    else leavePlayer(next);
    if (Number.isFinite(options.atMs)) player.seek(options.atMs);
    if (options.pollId) player.focusEvidence(options.pollId);
    onModeChange(mode);
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

  function leavePlayer(next = "analysis") {
    player.setActive(false);
    surface.setViewMode(next);
    mode = next;
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
  surface.setViewMode(mode);
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
