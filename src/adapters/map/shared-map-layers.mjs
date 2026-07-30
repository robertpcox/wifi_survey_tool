// FEATURE:      One shared Report and Player geographic map
// SURFACE:      createSharedMapLayers(map, currentFloor)
// WHY TOGETHER: Report heat, Player evidence, floor updates, and mode isolation share one map.
// STATE:        Current view mode and whether Player frame writes are enabled
// RULES:        Switching modes toggles stable layers and never creates another map.
// PROVENANCE:   Scope/steps/05a_recast_player.md shared map contract

import { createPlayerMapLayers } from "./player-map-layers.mjs";
import { createReportMapLayers } from "./report-map-layers.mjs";
import { createReportStalePathMapLayer } from "./report-stale-path-map-layer.mjs";
import { createReportWarningMapLayer } from "./report-warning-map-layer.mjs";
import { createReportWifiMapLayer } from "./report-wifi-map-layer.mjs";
import { followMapPoint } from "./map-camera-follow.mjs";

export function createSharedMapLayers(map, currentFloor) {
  const report = createReportMapLayers(map, currentFloor);
  const stalePath = createReportStalePathMapLayer(map, currentFloor);
  const warnings = createReportWarningMapLayer(map, currentFloor);
  const wifi = createReportWifiMapLayer(map, currentFloor);
  const player = createPlayerMapLayers(map, currentFloor);
  let mode = "analysis";
  let playerEnabled = false;

  function setViewMode(nextMode) {
    if (!["analysis", "playback"].includes(nextMode)) {
      throw new TypeError(`Unknown map view mode: ${nextMode}`);
    }
    mode = nextMode;
    playerEnabled = mode === "playback";
    report.ensure();
    stalePath.ensure();
    wifi.ensure();
    warnings.ensure();
    player.ensure();
    report.setVisible(mode === "analysis");
    stalePath.setVisible(true);
    warnings.setVisible(mode === "analysis");
    wifi.setVisible(mode === "analysis");
    player.setVisible(playerEnabled);
    return mode;
  }

  function drawReportHeat(kind, pointsOrAnalysis) {
    const count = report.draw(kind, pointsOrAnalysis);
    stalePath.draw(pointsOrAnalysis);
    wifi.draw(pointsOrAnalysis);
    warnings.draw(pointsOrAnalysis?.warnings?.floorMismatch);
    report.setVisible(mode === "analysis");
    stalePath.setVisible(true);
    warnings.setVisible(mode === "analysis");
    wifi.setVisible(mode === "analysis");
    return count;
  }

  function drawReportNotes(notes) {
    report.drawNotes(notes);
    report.setVisible(mode === "analysis");
  }

  function drawPlayerFrame(frame, snap) {
    if (!playerEnabled) return false;
    player.drawFrame(frame, snap);
    return true;
  }

  function disablePlayerLayers() {
    playerEnabled = false;
    player.setVisible(false);
  }

  function followWalker(walker) {
    if (!playerEnabled) return false;
    return followMapPoint(map, walker);
  }

  function applyFloor() {
    report.applyFloor();
    stalePath.applyFloor();
    warnings.applyFloor();
    wifi.applyFloor();
    player.applyFloor();
  }

  return Object.freeze({
    applyFloor,
    disablePlayerLayers,
    drawPlayerFrame,
    drawReportHeat,
    drawReportNotes,
    followWalker,
    focusEvidence: player.focusEvidence,
    onEvidenceSelect: player.onEvidenceSelect,
    setViewMode,
    get mode() { return mode; },
    get playerEnabled() { return playerEnabled; },
    get sourceIds() {
      return [
        ...report.sourceIds,
        ...stalePath.sourceIds,
        ...warnings.sourceIds,
        ...wifi.sourceIds,
        ...player.sourceIds,
      ];
    },
  });
}
