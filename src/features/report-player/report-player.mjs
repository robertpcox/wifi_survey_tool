// FEATURE:      Merged Report Player
// SURFACE:      mountReportPlayer(options)
// WHY TOGETHER: Result loading, shared map launch, store, and public Player API define one session.
// STATE:        One loaded result, analysis, MazeMap lifecycle, Player clock, and memory-only access
// RULES:        Parse once, attempt public MazeMap first, and expose mode/seek without reloading.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { comparisonEntries, loadSelectedResult, readUploadedResult } from "./result-loader.mjs";
import { bindMapAccess } from "./map-access.mjs";
import { createReportMapSurface } from "./map-surface.mjs";
import { bindReportInteractions } from "./report-interactions.mjs";
import { renderLoadPanel, renderReportShell } from "./report-shell.mjs";
import { createReportPlayerStore } from "./report-store.mjs";

export async function mountReportPlayer({
  root,
  selection,
  manifestSource,
  credentials,
  createMap,
  createPrivateMap,
  downloadFile,
}) {
  root.innerHTML = renderLoadPanel();
  const upload = root.querySelector("[data-result-upload]");
  const uploadSession = deferred();
  upload.addEventListener("change", async event => {
    try {
      const result = await readUploadedResult(event.target.files[0]);
      uploadSession.resolve(activate({ result, manifest: null }));
    } catch (error) {
      root.querySelector("[data-report-status]").textContent = error.message;
    }
  });
  const canLoadOverview = selection.customerId
    && selection.campusId
    && selection.view === "overview";
  if (!selection.customerId || (!selection.resultId && !canLoadOverview)) {
    return Object.freeze({ ready: uploadSession.promise, store: null });
  }
  try {
    const loaded = await loadSelectedResult({ selection, manifestSource });
    return activate(loaded);
  } catch (error) {
    root.querySelector("[data-report-status]").textContent =
      `${error.message}. Upload a local v3 result to continue.`;
    return Object.freeze({ ready: uploadSession.promise, store: null });
  }

  function activate(payload) {
    const requirePrivateAccess = payload.consolidated === true
      || payload.result.run.captureMode === "dynamic-room";
    const areaAccessError = new Error(
      "Private MazeMap access is required to resolve level polygons; area results have not been scored.",
    );
    const store = createReportPlayerStore();
    const state = store.load(payload);
    const candidates = payload.manifest
      ? comparisonEntries(payload.manifest, payload.result)
      : [];
    root.innerHTML = renderReportShell(state, candidates);
    const surface = createReportMapSurface({
      result: payload.result,
      canvas: root.querySelector("[data-report-map]"),
      mapElement: root.querySelector("[data-maze-map]"),
      fallbackElement: root.querySelector("[data-map-fallback]"),
      statusElement: root.querySelector("[data-map-runtime-status]"),
      createMap: (createMap ?? createPrivateMap)
        ? () => (createMap ?? createPrivateMap)(payload.result)
        : null,
    });
    surface.render({ analysis: state.analysis });
    let player = null;
    const access = bindMapAccess({
      root,
      result: payload.result,
      credentials,
      surface,
      requirePrivateAccess,
      onReady: () => player?.enableRoomLookup(),
      onDecline: () => player?.markRoomUnavailable(areaAccessError),
    });
    player = bindReportInteractions({
      root,
      store,
      surface,
      candidates,
      manifestSource,
      downloadFile,
    });
    const overviewReady = payload.initialView === "overview"
      ? player.prepareOverview()
      : Promise.resolve(false);
    const mapReady = surface.start().then(access.handleLaunch);
    const roomReady = Promise.all([mapReady, overviewReady]).then(() => (
      requirePrivateAccess && !access.accessReady
        ? player.markRoomUnavailable(areaAccessError)
        : surface.mapMode === "mazemap"
        ? player.enableRoomLookup()
        : player.markRoomUnavailable()
    ));
    return Object.freeze({
      mapReady,
      overviewReady,
      player,
      roomReady,
      store,
      surface,
      result: payload.result,
      meta: payload.result.meta,
    });
  }
}

function deferred() {
  let resolve;
  const promise = new Promise(accept => { resolve = accept; });
  return { promise, resolve };
}
