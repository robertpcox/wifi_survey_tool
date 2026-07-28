// FEATURE:      Merged Report Player interactions
// SURFACE:      bindReportInteractions(options), renderDynamicSections(state, candidates)
// WHY TOGETHER: Threshold, shared map, comparison, Player, and export controls coordinate one context.
// STATE:        Selected floor/heat layer and loaded comparison IDs
// RULES:        Re-render sections only; never reload, reparse, or mutate result evidence.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import { downloadFile as browserDownload } from "../../adapters/download.mjs";
import { assertReportResult } from "./result-loader.mjs";
import { renderComparisonView } from "./comparison-view.mjs";
import { renderHeatmapView } from "./heatmap-view.mjs";
import { renderKpiView } from "./kpi-view.mjs";
import { createAnalysisExports, renderMethodologyView } from "./methodology-view.mjs";
import { mountPlaybackView } from "./playback-view.mjs";
import { bindReportModes } from "./report-mode-controller.mjs";

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
  const floorInput = root.querySelector("[data-map-floor]");

  floorInput.addEventListener("change", event => {
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
  const player = mountPlaybackView(root.querySelector("[data-module=playback]"), {
    result: store.snapshot().result,
    transportRoot: root.querySelector("[data-player-transport]"),
    onFrame: (frame, options) => {
      floor = renderPlayerFrame({
        floor,
        floorInput,
        frame,
        options,
        surface,
      });
    },
    onEvidenceFocus: (id, trigger) => surface.focusEvidence(id, trigger),
  });
  const modes = bindReportModes({ root, store, surface, player });

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
  return Object.freeze({
    refresh,
    destroy: modes.destroy,
    focusEvidence: modes.focusEvidence,
    seek: modes.seek,
    setMode: modes.setMode,
    get atMs() { return modes.atMs; },
    get mode() { return modes.mode; },
  });
}

export function renderPlayerFrame({ floor, floorInput, frame, options, surface }) {
  let nextFloor = floor;
  if (options.follow && Number.isFinite(frame.walker?.z)) {
    nextFloor = frame.walker.z;
    if (nextFloor !== floor) floorInput.value = String(nextFloor);
    surface.followWalker(frame.walker);
  }
  surface.render({ frame, snap: options.snap, floor: nextFloor });
  return nextFloor;
}
