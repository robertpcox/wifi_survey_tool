// FEATURE:      Merged Report Player interactions
// SURFACE:      bindReportInteractions(options), renderDynamicSections(state, candidates)
// WHY TOGETHER: Threshold, shared map, comparison, Player, and export controls coordinate one context.
// STATE:        Selected floor/heat layer and loaded comparison IDs
// RULES:        Re-render sections only; never reload, reparse, or mutate result evidence.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { downloadFile as browserDownload } from "../../adapters/download.mjs";
import { assertReportResult } from "./result-loader.mjs";
import { renderComparisonView } from "./comparison-view.mjs";
import { bindReportFloor } from "./report-floor-controller.mjs";
import { renderHeatmapView } from "./heatmap-view.mjs";
import { renderKpiView } from "./kpi-view.mjs";
import { renderAnalysisMapAlerts, renderPlayerMapAlerts } from "./map-alert-view.mjs";
import { createAnalysisExports, renderMethodologyView } from "./methodology-view.mjs";
import { mountPlaybackView } from "./playback-view.mjs";
import { bindReportModes } from "./report-mode-controller.mjs";
import { bindReportWarningActions, renderReportWarnings } from "./report-warning-view.mjs";

export { renderPlayerFrame } from "./report-floor-controller.mjs";

export function renderDynamicSections(state, candidates) {
  return {
    mapAlerts: renderAnalysisMapAlerts(state.analysis),
    warnings: renderReportWarnings(state.analysis),
    kpi: renderKpiView(state.analysis),
    heatmap: renderHeatmapView(state),
    comparison: renderComparisonView({
      entries: candidates,
      comparison: state.comparison,
    }),
    methodology: renderMethodologyView(state),
  };
}

export function bindReportInteractions({
  root,
  store,
  surface,
  candidates,
  manifestSource,
  downloadFile = browserDownload,
}) {
  const loadedIds = new Set();
  let heatKind = "sticky";
  let currentAnalysis = store.snapshot().analysis;
  const status = root.querySelector("[data-report-status]");
  const floorInput = root.querySelector("[data-map-floor]");
  const alertRoot = root.querySelector("[data-module=mapAlerts]");
  const floor = bindReportFloor({
    surface,
    floorInput,
    initialFloor: store.snapshot().meta.zLevels[0],
  });
  root.querySelectorAll("[data-map-heat]").forEach(button => {
    button.addEventListener("click", () => {
      heatKind = button.dataset.mapHeat;
      root.querySelectorAll("[data-map-heat]").forEach(item => {
        item.classList.toggle("active", item === button);
      });
      surface.render({ heatKind });
    });
  });
  const player = mountPlaybackView(root.querySelector("[data-module=playback]"), {
    result: store.snapshot().result,
    transportRoot: root.querySelector("[data-player-transport]"),
    onFrame: (frame, options) => {
      floor.renderFrame(frame, options);
      alertRoot.innerHTML = renderPlayerMapAlerts(frame, {
        thresholds: currentAnalysis.thresholds,
        floors: currentAnalysis.floors,
      });
    },
    onInactive: () => {
      alertRoot.innerHTML = renderAnalysisMapAlerts(currentAnalysis);
    },
    onEvidenceFocus: (id, trigger) => surface.focusEvidence(id, trigger),
  });
  const modes = bindReportModes({ root, store, surface, player });
  root.querySelectorAll("[data-threshold]").forEach(input => {
    input.addEventListener("change", () => {
      store.setThresholds({
        stickySeconds: Number(root.querySelector("[data-threshold=stickySeconds]").value),
        accuracyM: Number(root.querySelector("[data-threshold=accuracyM]").value),
      });
      refresh();
    });
  });

  function refresh() {
    const state = store.snapshot();
    currentAnalysis = state.analysis;
    const remaining = candidates.filter(entry => !loadedIds.has(entry.resultId));
    const html = renderDynamicSections(state, remaining);
    for (const [module, markup] of Object.entries(html)) {
      root.querySelector(`[data-module=${module}]`).innerHTML = markup;
    }
    root.querySelector("[data-threshold=stickySeconds]").value = String(
      state.thresholds.stickySeconds,
    );
    root.querySelector("[data-threshold=accuracyM]").value = String(
      state.thresholds.accuracyM,
    );
    surface.render({ analysis: state.analysis, heatKind });
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
    const add = root.querySelector("[data-add-comparison]");
    add?.addEventListener("click", async () => {
      const id = root.querySelector("[data-comparison-result]").value;
      const entry = remaining.find(item => item.resultId === id);
      if (!entry) return;
      add.disabled = true;
      status.textContent = "Loading comparison result…";
      try {
        store.addComparison(assertReportResult(await manifestSource.result(entry.path)));
        loadedIds.add(id);
        status.textContent = "Comparison uses the same live thresholds.";
        refresh();
      } catch (error) {
        status.textContent = error.message;
        add.disabled = false;
      }
    });
  }

  refresh();
  return Object.freeze({
    refresh,
    destroy() {
      floor.destroy();
      modes.destroy();
    },
    focusEvidence: modes.focusEvidence,
    seek: modes.seek,
    setMode: modes.setMode,
    get atMs() { return modes.atMs; },
    get mode() { return modes.mode; },
  });
}
