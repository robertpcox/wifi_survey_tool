// FEATURE:      MazeMap Report/Player facade
// SURFACE:      createMazeMapSharedBoundary(options)
// WHY TOGETHER: Deferred layer binding and small feature-facing APIs share one adapter facade.
// STATE:        Current shared layers and evidence callback subscriptions
// RULES:        Calls remain provider-neutral and Player writes stop while disabled.
// PROVENANCE:   Scope/steps/05a_recast_player.md adapter API contract

export function createMazeMapSharedBoundary({ setFloor }) {
  const callbacks = new Set();
  const subscriptions = new Map();
  let layers = null;

  function bind(nextLayers) {
    for (const unsubscribe of subscriptions.values()) unsubscribe();
    subscriptions.clear();
    layers = nextLayers;
    for (const callback of callbacks) {
      subscriptions.set(callback, layers.onEvidenceSelect(callback));
    }
  }

  function drawReportHeat(kind, pointsOrAnalysis, floor) {
    if (Number.isFinite(Number(floor))) setFloor(Number(floor));
    return layers?.drawReportHeat(kind, pointsOrAnalysis) ?? false;
  }

  function drawPlayerFrame(frame, snap) {
    return layers?.drawPlayerFrame(frame, snap) ?? false;
  }

  function setViewMode(mode) {
    return layers?.setViewMode(mode) ?? false;
  }

  function disablePlayerLayers() {
    layers?.disablePlayerLayers();
  }

  function onEvidenceSelect(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Evidence selection callback must be a function.");
    }
    callbacks.add(callback);
    if (layers) subscriptions.set(callback, layers.onEvidenceSelect(callback));
    return () => {
      callbacks.delete(callback);
      subscriptions.get(callback)?.();
      subscriptions.delete(callback);
    };
  }

  function focusEvidence(pairId, trigger = "keyboard") {
    return layers?.focusEvidence(pairId, trigger) ?? false;
  }

  function followWalker(walker) {
    if (!layers?.playerEnabled) return false;
    if (Number.isFinite(Number(walker?.z))) setFloor(Number(walker.z));
    return layers.followWalker(walker);
  }

  return Object.freeze({
    bind,
    disablePlayerLayers,
    drawPlayerFrame,
    drawReportHeat,
    followWalker,
    focusEvidence,
    onEvidenceSelect,
    setViewMode,
    get mode() { return layers?.mode ?? null; },
  });
}
