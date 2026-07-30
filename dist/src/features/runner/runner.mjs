import { downloadFile as browserDownload } from "../../adapters/files.mjs";
import {
  createRouteState,
  createSessionState,
} from "../../domain/survey-state.mjs";
import { tsName } from "../../shared/format.mjs";
import { sleep as browserSleep } from "../../shared/time.mjs";
import { createCaptureView } from "./capture-view.mjs";
import { createPlaybackController } from "./playback.mjs";
import { createPollingController } from "./polling.mjs";
import { buildSession, buildSessionCsv } from "./session.mjs";
import { createWalkView } from "./walk-view.mjs";
import { createWalkController } from "./walk.mjs";

export function createRunner(options = {}) {
  const routeState = options.routeState ?? createRouteState();
  const sessionState = options.sessionState ?? createSessionState();
  const documentRef = options.documentRef ?? globalThis.document;
  const mapAdapter = options.mapAdapter ?? {};
  const setStatus = options.setStatus ?? (() => {});
  const nowMs = options.nowMs ?? Date.now;
  const nowDate = options.nowDate ?? (() => new Date(nowMs()));
  const download = options.downloadFile
    ?? ((name, content, type) =>
      browserDownload(name, content, type, documentRef));
  const captureView = createCaptureView(documentRef, nowMs);
  const walkView = createWalkView({
    documentRef,
    routeState,
    sessionState,
    mapAdapter,
    nowMs,
  });
  let playback;
  const isPlaybackActive = () => Boolean(playback?.active);
  const polling = createPollingController({
    documentRef,
    sessionState,
    mapAdapter,
    walkView,
    captureView,
    setStatus,
    fetchImpl: options.fetchImpl,
    nowMs,
    sleep: options.sleep ?? browserSleep,
    isPlaybackActive,
  });
  const walk = createWalkController({
    routeState,
    sessionState,
    mapAdapter,
    walkView,
    captureView,
    setStatus,
    startPolling: polling.startPolling,
    isPlaybackActive,
    getRouteName: () =>
      documentRef?.getElementById("routeName")?.value?.trim?.() ?? "",
    nowMs,
    nowDate,
    vibrate: options.vibrate,
  });
  playback = createPlaybackController({
    routeState,
    sessionState,
    mapAdapter,
    walkView,
    captureView,
    stopPolling: polling.stopPolling,
    setStatus,
    setIntervalImpl: options.setIntervalImpl,
    clearIntervalImpl: options.clearIntervalImpl,
  });

  function exportSessionJson() {
    const filename = tsName("json", nowDate());
    const session = buildSession({
      routeState,
      sessionState,
      config: polling.readConfig(),
      nowDate,
    });
    download(filename, JSON.stringify(session, null, 2), "application/json");
  }

  function exportSessionCsv() {
    const filename = tsName("csv", nowDate());
    download(filename, buildSessionCsv(sessionState), "text/csv");
  }

  function clearSession() {
    sessionState.samples = [];
    sessionState.events = [];
    sessionState.sampleSeq = 0;
    sessionState.sampleCounts = { cloud: 0, lipi: 0 };
    sessionState.meta = {
      startedAt: null,
      endedAt: null,
      routeName: "",
    };
    routeState.waypoints.forEach(waypoint => {
      waypoint.state = "pending";
    });
    walk.reset();
    mapAdapter.clearTargetMarker?.();
    walkView.resetCounts();
    mapAdapter.drawTrails?.(sessionState.samples);
    mapAdapter.drawWaypoints?.(routeState.waypoints);
    updateWalkCard();
    captureView.renderLog(sessionState.events);
    setStatus("", "Session cleared — route kept");
  }

  function updateWalkCard() {
    walkView.updateCard(isPlaybackActive());
  }

  function resetForRouteChange() {
    walk.reset();
    updateWalkCard();
  }

  const actions = {
    clearSession,
    endWalk: walk.endWalk,
    exportSessionCsv,
    exportSessionJson,
    importSession: playback.importSession,
    exitPlayback: playback.exitPlayback,
    pbSeek: playback.pbSeek,
    pbTogglePlay: playback.pbTogglePlay,
    skipWaypoint: walk.skipWaypoint,
    startPolling: polling.startPolling,
    stopPolling: polling.stopPolling,
    undoCheckin: walk.undoCheckin,
    walkMainAction: walk.walkMainAction,
  };

  return {
    actions,
    initialize: () => {
      updateWalkCard();
      captureView.renderLog(sessionState.events);
    },
    isRouteEditingBlocked: walk.isRouteEditingBlocked,
    routeBuilt: resetForRouteChange,
    routeInvalidated: resetForRouteChange,
    updateWalkCard,
  };
}
