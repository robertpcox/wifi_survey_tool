// FEATURE:      Merged Report Player interactions
// SURFACE:      bindReportInteractions(options), renderDynamicSections(state, candidates)
// WHY TOGETHER: Threshold, map, playback, comparison, tab, and export controls coordinate one shared context.
// STATE:        Selected floor/heat layer and loaded comparison IDs
// RULES:        Re-render sections only; never reload, reparse, or mutate result evidence.
// PROVENANCE:   Scope/steps/05_dashboard_report_player.md

import { downloadFile as browserDownload } from "../../adapters/download.mjs";
import { assertReportResult } from "./result-loader.mjs";
import { renderComparisonView } from "./comparison-view.mjs";
import { renderHeatmapView } from "./heatmap-view.mjs";
import { renderKpiView } from "./kpi-view.mjs";
import { createAnalysisExports, renderMethodologyView } from "./methodology-view.mjs";
import { mountPlaybackView } from "./playback-view.mjs";

export function renderDynamicSections(state, candidates) {
  return {
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
  let floor = store.snapshot().meta.zLevels[0];
  let heatKind = "sticky";
  const status = root.querySelector("[data-report-status]");

  root.querySelector("[data-map-floor]").addEventListener("change", event => {
    floor = Number(event.target.value);
    surface.render({ floor });
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
  root.querySelectorAll("[data-report-view]").forEach(button => {
    button.addEventListener("click", () => {
      const view = button.dataset.reportView;
      store.setView(view);
      root.querySelectorAll("[data-report-view]").forEach(item => {
        item.setAttribute("aria-selected", String(item === button));
      });
      root.querySelectorAll("[data-report-pane]").forEach(pane => {
        pane.hidden = pane.dataset.reportPane !== view;
      });
    });
  });
  mountPlaybackView(root.querySelector("[data-module=playback]"), {
    result: store.snapshot().result,
    onFrame: frame => surface.render({ frame, floor, heatKind }),
  });

  function refresh() {
    const state = store.snapshot();
    const remaining = candidates.filter(entry => !loadedIds.has(entry.resultId));
    const html = renderDynamicSections(state, remaining);
    for (const [module, markup] of Object.entries(html)) {
      root.querySelector(`[data-module=${module}]`).innerHTML = markup;
    }
    surface.render({ analysis: state.analysis, floor, heatKind });
    bindDynamic(state, remaining);
  }

  function bindDynamic(state, remaining) {
    root.querySelectorAll("[data-threshold]").forEach(input => {
      input.addEventListener("change", () => {
        store.setThresholds({
          stickySeconds: Number(root.querySelector("[data-threshold=stickySeconds]").value),
          accuracyM: Number(root.querySelector("[data-threshold=accuracyM]").value),
        });
        refresh();
      });
    });
    root.querySelectorAll("[data-action^=export-analysis]").forEach(button => {
      button.addEventListener("click", () => {
        const kind = button.dataset.action.endsWith("csv") ? "csv" : "json";
        const file = createAnalysisExports(state.result, state.analysis)[kind];
        downloadFile(file.filename, file.content, file.mediaType);
      });
    });
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
  return Object.freeze({ refresh });
}
