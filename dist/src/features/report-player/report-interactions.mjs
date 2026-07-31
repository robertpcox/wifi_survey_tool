// FEATURE:      Merged Report Player interactions
// SURFACE:      bindReportInteractions(options), re-exported renderDynamicSections
// WHY TOGETHER: Threshold, shared map, comparison, Player, and export controls coordinate one context.
// STATE:        Selected floor/highlight, loaded comparison IDs, and the lazy all-runs cache
// RULES:        Re-render sections only; never reload, reparse, or mutate result evidence.
// PROVENANCE:   Scope/steps/05a_recast_player.md
import { downloadFile as browserDownload } from "../../adapters/download.mjs";
import { assertReportResult, campusRunEntries } from "./result-loader.mjs";
import { bindAllRunsAction, createAllRunsLoader } from "./all-runs.mjs";
import { createCampusOverviewController } from "./campus-overview-controller.mjs";
import { bindComparisonAdd } from "./comparison-view.mjs";
import { bindReportFloor } from "./report-floor-controller.mjs";
import { bindMapHighlight } from "./map-highlight-controller.mjs";
import { renderConcernDetail, renderPlayerMapAlerts } from "./map-alert-view.mjs";
import { createAnalysisExports } from "./methodology-view.mjs";
import { mountPlaybackView } from "./playback-view.mjs";
import { bindReportModes } from "./report-mode-controller.mjs";
import { renderDynamicSections } from "./report-sections.mjs";
import { bindReportWarningActions } from "./report-warning-view.mjs";
export { renderPlayerFrame } from "./report-floor-controller.mjs";
export { renderDynamicSections } from "./report-sections.mjs";

export function bindReportInteractions({
  root,
  store,
  surface,
  candidates,
  manifestSource,
  downloadFile = browserDownload,
}) {
  const loadedIds = new Set();
  let currentAnalysis = store.snapshot().analysis;
  const status = root.querySelector("[data-report-status]");
  const floorInput = root.querySelector("[data-map-floor]");
  const alertRoot = root.querySelector("[data-module=mapAlerts]");
  const allRunsLoader = createAllRunsLoader({
    entries: campusRunEntries(store.snapshot().manifest, store.snapshot().result),
    manifestSource,
    assertResult: assertReportResult,
  });
  const overviewController = createCampusOverviewController(
    { store, loader: allRunsLoader, floorInput },
  );
  const floor = bindReportFloor(
    { surface, floorInput, initialFloor: store.snapshot().meta.zLevels[0] },
  );
  const player = mountPlaybackView(root.querySelector("[data-module=playback]"), {
    result: store.snapshot().result,
    transportRoot: root.querySelector("[data-player-transport]"),
    onFrame: (frame, options) => {
      floor.renderFrame(frame, options);
      alertRoot.innerHTML = renderPlayerMapAlerts(frame, {
        thresholds: currentAnalysis.thresholds,
        floors: currentAnalysis.floors,
        highlightKind: highlight.kind,
      });
    },
    onInactive: () => { alertRoot.innerHTML = ""; },
    onEvidenceFocus: (id, trigger) => surface.focusEvidence(id, trigger),
  });
  const modes = bindReportModes(
    { root, store, surface, player, onModeChange: () => repaintMap() },
  );
  function repaintMap() {
    surface.render({
      analysis: overviewController.mapAnalysis(modes.mode, currentAnalysis),
      heatKind: highlight.kind,
    });
  }
  const offConcern = surface.onEvidenceSelect(event => {
    if (modes.mode !== "analysis"
      || !String(event?.pairId ?? "").startsWith("concern:")) return;
    alertRoot.innerHTML = renderConcernDetail(event.properties ?? {});
  });
  const highlight = bindMapHighlight({
    root,
    onChange: () => {
      repaintMap();
      if (modes.mode === "playback") player.seek(player.atMs);
    },
  });
  root.querySelectorAll("[data-threshold]").forEach(input => {
    input.addEventListener("change", () => {
      store.setThresholds({
        stickySeconds: Number(root.querySelector("[data-threshold=stickySeconds]").value),
        accuracyM: Number(root.querySelector("[data-threshold=accuracyM]").value),
      });
      overviewController.rebuild();
      refresh();
    });
  });

  function refresh() {
    const state = store.snapshot();
    currentAnalysis = state.analysis;
    const remaining = candidates.filter(entry => !loadedIds.has(entry.resultId));
    const html = renderDynamicSections(state, remaining, {
      entryCount: allRunsLoader.entryCount,
      loaded: allRunsLoader.loaded,
      rows: allRunsLoader.loaded ? allRunsLoader.rows(state.result, state.thresholds) : [],
    });
    for (const [module, markup] of Object.entries(html)) {
      root.querySelector(`[data-module=${module}]`).innerHTML = markup;
    }
    root.querySelector("[data-module=overview]").innerHTML =
      overviewController.panelHtml();
    for (const [key, value] of Object.entries(state.thresholds)) {
      const input = root.querySelector(`[data-threshold=${key}]`);
      if (input) input.value = String(value);
    }
    repaintMap();
    bindDynamic(state, remaining);
    if (modes.mode === "playback") player.seek(player.atMs);
  }

  function bindDynamic(state, remaining) {
    root.querySelectorAll("[data-action^=export-analysis]").forEach(button => {
      button.addEventListener("click", () => {
        const kind = button.dataset.action.endsWith("csv") ? "csv" : "json";
        const file = createAnalysisExports(state.result, state.analysis)[kind];
        downloadFile(file.filename, file.content, file.mediaType);
      });
    });
    bindReportWarningActions(root, options => modes.setMode("playback", options));
    overviewController.bindLoadAction(root, refresh);
    bindAllRunsAction(root, { loader: allRunsLoader, status, refresh });
    bindComparisonAdd(root, {
      remaining,
      status,
      refresh,
      addResult: async entry => store.addComparison(
        assertReportResult(await manifestSource.result(entry.path)),
      ),
      markLoaded: id => loadedIds.add(id),
    });
  }

  refresh();
  return Object.freeze({
    refresh,
    destroy() { floor.destroy(); modes.destroy(); offConcern(); },
    focusEvidence: modes.focusEvidence,
    seek: modes.seek,
    setMode: modes.setMode,
    get atMs() { return modes.atMs; },
    get highlightKind() { return highlight.kind; },
    get mode() { return modes.mode; },
  });
}
