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

export function createCampusOverviewController({
  store, loader, floorInput = null, includeCurrent = true,
}) {
  let built = null;
  let roomSummary = null;

  function rebuild() {
    if (!loader.loaded) return null;
    const state = store.snapshot();
    built = buildCampusOverviewModel({
      result: state.result,
      analysis: state.analysis,
      thresholds: state.thresholds,
      others: loader.records?.() ?? loader.results(),
      includeResult: includeCurrent,
    });
    built.mapAnalysis = overviewMapWithRooms(built, roomSummary);
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
        await load((done, total) => {
          if (progress) progress.textContent = `Loading run ${done} of ${total}…`;
        });
      } catch (error) {
        if (progress) progress.textContent = error.message;
        return;
      }
      refresh();
    });
  }

  async function load(onProgress) {
    await loader.load(onProgress);
    return rebuild();
  }

  return Object.freeze({
    bindLoadAction,
    load,
    rebuild,
    setRoomSummary(value) {
      roomSummary = value;
      if (built) built.mapAnalysis = overviewMapWithRooms(built, roomSummary);
    },
    mapAnalysis(mode, fallback) {
      if (mode !== "overview") return fallback;
      return built?.mapAnalysis ?? emptyOverviewAnalysis(fallback);
    },
    panelHtml() {
      return renderCampusOverviewPanel({
        overview: built?.model ?? null,
        entryCount: loader.entryCount,
        failureCount: loader.failureCount ?? 0,
        includeCurrent,
        loaded: Boolean(built),
      });
    },
    get loaded() { return Boolean(built); },
  });
}

function overviewMapWithRooms(built, roomSummary) {
  if (!roomSummary) return built.mapAnalysis;
  return {
    ...built.mapAnalysis,
    areaResolution: roomSummary,
    fitPoints: [
      ...built.mapAnalysis.fitPoints,
      ...roomSummary.truthIssuePoints,
      ...roomSummary.ciscoIssuePoints,
    ],
    heatmaps: {
      ...built.mapAnalysis.heatmaps,
      room: built.model.floors.map(floor => ({
        ...floor,
        points: roomSummary.ciscoIssuePoints
          .filter(point => Number(point.z) === Number(floor.z)),
      })),
    },
  };
}

function emptyOverviewAnalysis(fallback) {
  const floors = fallback?.floors ?? [];
  const empty = () => floors.map(floor => ({ ...floor, points: [] }));
  return {
    overview: true,
    floors,
    fitPoints: [],
    heatmaps: {
      freeze: empty(), sticky: empty(), lag: empty(), accuracy: empty(), room: empty(),
    },
    concernSegments: [],
    stalePathSegments: [],
    timeline: [],
    warnings: { floorMismatch: { points: [] } },
    areaResolution: null,
  };
}
