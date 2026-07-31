// FEATURE:      Campus overview surface
// SURFACE:      createCampusOverviewController({ store, loader, floorInput })
// WHY TOGETHER: Lazy merged-model building, floor options, and the load action share one lifecycle.
// STATE:        The built merged model and its map-ready analysis
// RULES:        Merging happens only on request and rebuilds against the live thresholds.
// PROVENANCE:   NDH merged campus picture · problem areas across runs, devices, and days

import {
  buildCampusOverviewModel,
  renderCampusOverviewPanel,
} from "./campus-overview.mjs";

export function createCampusOverviewController({ store, loader, floorInput = null }) {
  let built = null;

  function rebuild() {
    if (!loader.loaded) return null;
    const state = store.snapshot();
    built = buildCampusOverviewModel({
      result: state.result,
      analysis: state.analysis,
      thresholds: state.thresholds,
      others: loader.results(),
    });
    extendFloorOptions();
    return built;
  }

  function extendFloorOptions() {
    if (!floorInput || !built) return;
    for (const floor of built.model.floors) {
      const known = [...(floorInput.options ?? [])]
        .some(option => Number(option.value) === floor.z);
      if (!known) {
        floorInput.insertAdjacentHTML?.(
          "beforeend",
          `<option value="${floor.z}">${floor.name}</option>`,
        );
      }
    }
  }

  function bindLoadAction(root, refresh) {
    root.querySelector("[data-load-overview]")?.addEventListener("click", async () => {
      const progress = root.querySelector("[data-overview-status]");
      try {
        await loader.load((done, total) => {
          if (progress) progress.textContent = `Loading run ${done} of ${total}…`;
        });
        rebuild();
      } catch (error) {
        if (progress) progress.textContent = error.message;
        return;
      }
      refresh();
    });
  }

  return Object.freeze({
    bindLoadAction,
    rebuild,
    mapAnalysis(mode, fallback) {
      return mode === "overview" && built ? built.mapAnalysis : fallback;
    },
    panelHtml() {
      return renderCampusOverviewPanel({
        overview: built?.model ?? null,
        entryCount: loader.entryCount,
        loaded: Boolean(built),
      });
    },
    get loaded() { return Boolean(built); },
  });
}
