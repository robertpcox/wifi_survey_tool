// FEATURE:      Player paired-evidence map interaction
// SURFACE:      createEvidenceInteractions(map, layerSources)
// WHY TOGETHER: Hover, tap/click, and programmatic keyboard focus select one poll pair.
// STATE:        Registered listeners, callbacks, and selected pair ID
// RULES:        Emit provider-neutral details; either pair member resolves the same pair ID.
// PROVENANCE:   Scope/steps/05a_recast_player.md poll-pair interaction acceptance

export function createEvidenceInteractions(map, layerSources) {
  const callbacks = new Set();
  let bound = false;
  let selectedPairId = null;

  function bind() {
    if (bound) return;
    bound = true;
    for (const [layerId] of layerSources) {
      map.on?.("mouseenter", layerId, event => selectFeature(event, "hover"));
      map.on?.("click", layerId, event => selectFeature(
        event,
        event?.originalEvent?.pointerType === "touch" ? "tap" : "click",
      ));
    }
  }

  function onEvidenceSelect(callback) {
    if (typeof callback !== "function") {
      throw new TypeError("Evidence selection callback must be a function.");
    }
    callbacks.add(callback);
    bind();
    return () => callbacks.delete(callback);
  }

  function focusEvidence(pairId, trigger = "keyboard") {
    const id = cleanId(pairId);
    if (!id) return false;
    const pollId = id.startsWith("poll:") ? id.slice(5) : id;
    const canonicalPairId = id.startsWith("poll:") ? id : `poll:${id}`;
    applySelectedState(pollId);
    emit({
      pairId: canonicalPairId,
      pollId,
      trigger,
      properties: Object.freeze({ pairId: canonicalPairId, pollId }),
      coordinates: null,
    });
    return true;
  }

  function selectFeature(event, trigger) {
    const feature = event?.features?.[0];
    const properties = feature?.properties ?? {};
    const pairId = cleanId(properties.pairId ?? properties.pollId ?? feature?.id);
    if (!pairId) return;
    applySelectedState(cleanId(feature?.id ?? properties.pollId) ?? pairId);
    emit({
      pairId,
      pollId: cleanId(properties.pollId) ?? pairId,
      trigger,
      properties: Object.freeze({ ...properties }),
      coordinates: featureCoordinates(feature),
    });
  }

  function applySelectedState(pairId) {
    if (selectedPairId === pairId) return;
    for (const [_layerId, source] of layerSources) {
      if (selectedPairId) {
        try {
          map.setFeatureState?.({ source, id: selectedPairId }, { selected: false });
        } catch {}
      }
      try {
        map.setFeatureState?.({ source, id: pairId }, { selected: true });
      } catch {}
    }
    selectedPairId = pairId;
  }

  function emit(selection) {
    const safeSelection = Object.freeze(selection);
    for (const callback of callbacks) callback(safeSelection);
  }

  return Object.freeze({
    bind,
    focusEvidence,
    onEvidenceSelect,
    get selectedPairId() { return selectedPairId; },
  });
}

function cleanId(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function featureCoordinates(feature) {
  const coordinates = feature?.geometry?.coordinates;
  if (!Array.isArray(coordinates)) return null;
  if (feature.geometry.type === "Point") return Object.freeze([...coordinates]);
  return null;
}
