// FEATURE:      Consolidated report collection
// SURFACE:      createReportCollectionController(options)
// WHY TOGETHER: Campus run loading, merged map, and asynchronous room evidence share one lifecycle.
// STATE:        Cached run bundle, overview model, room lookup readiness, and room summary
// RULES:        Reviewed exceptions travel with every run; room lookup starts only after map launch.
// PROVENANCE:   Campus-level consolidated report and dynamic dwell room evidence

import { assertReportResult, campusRunEntries } from "./result-loader.mjs";
import { bindAllRunsAction, createAllRunsLoader } from "./all-runs.mjs";
import { createCampusOverviewController } from "./campus-overview-controller.mjs";
import { createRoomResolutionLoader } from "./room-resolution-loader.mjs";
import { renderRoomResolutionView } from "./room-resolution-view.mjs";

export function createReportCollectionController({
  store, manifestSource, floorInput, surface,
}) {
  const initial = store.snapshot();
  const currentEligible = !(initial.exceptions ?? [])
    .some(item => item.disposition === "exclude-run");
  const loader = createAllRunsLoader({
    entries: campusRunEntries(initial.manifest, initial.result),
    manifestSource,
    assertResult: assertReportResult,
  });
  const overview = createCampusOverviewController({
    store, loader, floorInput, includeCurrent: currentEligible,
  });
  const rooms = createRoomResolutionLoader({
    resolveRoomAt: surface.adapter?.resolveRoomAt,
    resolveRoomById: surface.adapter?.resolveRoomById,
    resolveCampusRooms: surface.adapter?.resolveCampusRooms,
  });
  let roomLookupReady = false;
  let roomWork = null;
  let roomWorkAll = false;
  function allRunsState(state) {
    return {
      entryCount: loader.entryCount,
      loaded: loader.loaded,
      failureCount: loader.failureCount,
      rows: loader.loaded
        ? loader.rows(state.result, state.thresholds, undefined, state.exceptions)
        : [],
    };
  }
  function mapAnalysis(mode, fallback) {
    const selected = overview.mapAnalysis(mode, fallback);
    if (mode === "overview" || rooms.status !== "ready") return selected;
    return withRoomHeat(selected, rooms.summary);
  }
  function bind(root, { refresh, status }) {
    root.querySelector("[data-load-overview]")?.addEventListener("click", async () => {
      await loadOverview(refresh, root.querySelector("[data-overview-status]"));
    });
    bindAllRunsAction(root, { loader, status, refresh });
  }

  async function loadOverview(refresh, progress = null) {
    try {
      await overview.load((done, total) => {
        if (progress) progress.textContent = `Loading run ${done} of ${total}…`;
      });
      if (roomLookupReady) await resolveRooms(true, refresh);
      else refresh();
      if (progress) progress.textContent = reportStatus(
        loader.loadedCount + Number(currentEligible),
        loader.failureCount,
      );
      return overview.loaded;
    } catch (error) {
      if (progress) progress.textContent = error.message;
      return false;
    }
  }

  async function resolveRooms(all, refresh) {
    if (!roomLookupReady) return rooms.summary;
    if (roomWork) {
      if (!all || roomWorkAll) return roomWork;
      await roomWork;
    }
    const current = store.snapshot();
    const bundles = currentEligible
      ? [{ result: current.result, exceptions: current.exceptions }] : [];
    if (all) bundles.push(...loader.records());
    roomWorkAll = all;
    const work = rooms.load(bundles).then(summary => {
      if (rooms.status === "ready") overview.setRoomSummary(summary);
      return summary;
    });
    roomWork = work;
    void work.finally(() => {
      if (roomWork === work) {
        roomWork = null;
        roomWorkAll = false;
        refresh();
      }
    });
    refresh();
    return work;
  }

  function roomHtml() {
    return renderRoomResolutionView({
      status: rooms.status,
      summary: rooms.summary,
      error: rooms.error,
    });
  }

  return Object.freeze({
    allRunsState,
    bind,
    loadOverview,
    mapAnalysis,
    overviewHtml: () => `${overview.panelHtml()}${roomHtml()}`,
    rebuild: overview.rebuild,
    roomHtml,
    async enableRoomLookup(refresh) {
      roomLookupReady = true;
      return resolveRooms(overview.loaded, refresh);
    },
    markRoomUnavailable(refresh, cause = null) {
      roomLookupReady = false;
      rooms.setUnavailable(cause);
      refresh();
    },
    get overviewLoaded() { return overview.loaded; },
    get roomStatus() { return rooms.status; },
    get roomSummary() { return rooms.summary; },
  });
}
function withRoomHeat(analysis, summary) {
  return {
    ...analysis,
    areaResolution: summary,
    heatmaps: {
      ...analysis.heatmaps,
      room: analysis.floors.map(floor => ({ ...floor, points: [] })),
    },
  };
}

function reportStatus(runCount, failureCount) {
  return `Campus report · ${runCount} eligible run(s) merged${failureCount
    ? ` · ${failureCount} unavailable` : ""}`;
}
