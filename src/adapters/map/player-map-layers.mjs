// FEATURE:      Full-screen Player shared-map adapter
// SURFACE:      createPlayerMapLayers(map, currentFloor)
// WHY TOGETHER: Stable Player layers, deterministic frame writes, and pair interaction share one boundary.
// STATE:        Installed layer group and selected evidence interaction
// RULES:        All frame sources are floor-filtered; disabling hides without clearing evidence.
// PROVENANCE:   Scope/steps/05a_recast_player.md shared Player layer contract

import { createEvidenceInteractions } from "./evidence-interactions.mjs";
import { createGeoJsonLayerGroup } from "./geojson-layer-group.mjs";
import { buildPlayerFeatureCollections } from "./player-map-features.mjs";
import {
  PLAYER_EVIDENCE_LAYERS,
  playerLayerDefinitions,
} from "./player-layer-definitions.mjs";

export function createPlayerMapLayers(map, currentFloor) {
  const group = createGeoJsonLayerGroup(
    map,
    playerLayerDefinitions(),
    currentFloor,
  );
  const interactions = createEvidenceInteractions(map, PLAYER_EVIDENCE_LAYERS);

  function drawFrame(frame, snap) {
    const collections = buildPlayerFeatureCollections(frame, snap);
    group.ensure();
    for (const [source, features] of Object.entries(collections)) {
      group.setData(source, features);
    }
    return collections;
  }

  function onEvidenceSelect(callback) {
    group.ensure();
    return interactions.onEvidenceSelect(callback);
  }

  function focusEvidence(pairId, trigger) {
    group.ensure();
    return interactions.focusEvidence(pairId, trigger);
  }

  return Object.freeze({
    applyFloor: group.applyFloor,
    drawFrame,
    ensure: group.ensure,
    focusEvidence,
    onEvidenceSelect,
    setVisible: group.setVisible,
    get layerIds() { return group.layerIds; },
    get sourceIds() { return group.sourceIds; },
  });
}
