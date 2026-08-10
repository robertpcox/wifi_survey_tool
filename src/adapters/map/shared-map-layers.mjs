// FEATURE:      One shared Report and Player geographic map
// SURFACE:      createSharedMapLayers(map, currentFloor)
// WHY TOGETHER: Report heat, Player evidence, floor updates, and mode isolation share one map.
// STATE:        Current view mode and whether Player frame writes are enabled
// RULES:        Switching modes toggles stable layers and never creates another map.
// PROVENANCE:   Scope/steps/05a_recast_player.md shared map contract

import { createPlayerMapLayers } from "./player-map-layers.mjs";
import { createReportAreaResolutionMapLayer }
  from "./report-area-resolution-map-layer.mjs";
import { createReportConcernMapLayer } from "./report-concern-map-layer.mjs";
import { createReportMapLayers } from "./report-map-layers.mjs";
import { createReportStalePathMapLayer } from "./report-stale-path-map-layer.mjs";
import { createReportWarningMapLayer } from "./report-warning-map-layer.mjs";
import { createReportWifiMapLayer } from "./report-wifi-map-layer.mjs";
import { followMapPoint } from "./map-camera-follow.mjs";

export function createSharedMapLayers(map, currentFloor) {
  const report = createReportMapLayers(map, currentFloor);
  const area = createReportAreaResolutionMapLayer(map, currentFloor);
  const concern = createReportConcernMapLayer(map, currentFloor);
  const stalePath = createReportStalePathMapLayer(map, currentFloor);
  const warnings = createReportWarningMapLayer(map, currentFloor);
  const wifi = createReportWifiMapLayer(map, currentFloor);
  const player = createPlayerMapLayers(map, currentFloor);
  let mode = "analysis";
  let highlightKind = "sticky";
  let playerEnabled = false;
  let reportOverview = false;

  function applyVisibility() {
    const analysisVisible = mode === "analysis";
    report.setHeatVisible(highlightKind !== "none");
    report.setNotesVisible(analysisVisible);
    concern.setVisible(analysisVisible);
    stalePath.setVisible(highlightKind === "freeze"
      || (!reportOverview && highlightKind === "sticky"));
    warnings.setVisible(analysisVisible);
    wifi.setVisible(analysisVisible);
    area.setVisible(analysisVisible && highlightKind === "room");
    player.setVisible(playerEnabled);
  }

  function setViewMode(nextMode) {
    if (!["analysis", "playback"].includes(nextMode)) {
      throw new TypeError(`Unknown map view mode: ${nextMode}`);
    }
    mode = nextMode;
    playerEnabled = mode === "playback";
    report.ensure();
    area.ensure();
    concern.ensure();
    stalePath.ensure();
    wifi.ensure();
    warnings.ensure();
    player.ensure();
    applyVisibility();
    return mode;
  }

  function drawReportHeat(kind, pointsOrAnalysis) {
    const count = report.draw(kind, pointsOrAnalysis);
    highlightKind = kind;
    reportOverview = pointsOrAnalysis?.overview === true;
    concern.draw(pointsOrAnalysis);
    stalePath.draw(pointsOrAnalysis);
    wifi.draw(pointsOrAnalysis);
    warnings.draw(pointsOrAnalysis?.warnings?.floorMismatch);
    area.draw(pointsOrAnalysis?.areaResolution);
    applyVisibility();
    return count;
  }

  function drawReportNotes(notes) {
    report.drawNotes(notes);
    applyVisibility();
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
    concern.applyFloor();
    stalePath.applyFloor();
    warnings.applyFloor();
    wifi.applyFloor();
    area.applyFloor();
    player.applyFloor();
  }

  function onEvidenceSelect(callback) {
    const offPlayer = player.onEvidenceSelect(callback);
    const offConcern = concern.onEvidenceSelect(callback);
    return () => {
      offPlayer();
      offConcern();
    };
  }

  return Object.freeze({
    applyFloor,
    disablePlayerLayers,
    drawPlayerFrame,
    drawReportHeat,
    drawReportNotes,
    followWalker,
    focusEvidence: player.focusEvidence,
    onEvidenceSelect,
    setViewMode,
    get highlightKind() { return highlightKind; },
    get mode() { return mode; },
    get playerEnabled() { return playerEnabled; },
    get sourceIds() {
      return [
        ...report.sourceIds,
        ...area.sourceIds,
        ...concern.sourceIds,
        ...stalePath.sourceIds,
        ...warnings.sourceIds,
        ...wifi.sourceIds,
        ...player.sourceIds,
      ];
    },
  });
}
