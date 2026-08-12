// FEATURE:      Consolidated report collection
// SURFACE:      createReportCollectionController(options)
// WHY TOGETHER: Campus run loading, merged map, and asynchronous room evidence share one lifecycle.
// STATE:        Cached bundles, selected runs, overview model, and room lookup work
// RULES:        One selected ID set filters route and area evidence; reviewed exceptions stay attached.
// PROVENANCE:   User-selected campus report and area resolution

import { assertReportResult, campusRunEntries } from "./result-loader.mjs";
import { bindAllRunsAction, createAllRunsLoader } from "./all-runs.mjs";
import { createCampusOverviewController } from "./campus-overview-controller.mjs";
import { createCampusRunSelection } from "./campus-run-selection.mjs";
import {
  analysisWithAreaResolution, collectionAllRunsState, collectionRoomHtml,
  selectedCampusReportStatus,
} from "./report-collection-values.mjs";
import { createRoomResolutionLoader } from "./room-resolution-loader.mjs";

export function createReportCollectionController({
  store, manifestSource, floorInput, surface,
}) {
  const initial = store.snapshot();
  const withRendering = surface.withRendering ?? ((_message, work) => work());
  const roomViewOptions = { showDevice: !initial.consolidated };
  const currentEligible = !(initial.exceptions ?? [])
    .some(item => item.disposition === "exclude-run");
  const entries = campusRunEntries(initial.manifest, initial.result);
  const runSelection = createCampusRunSelection({
    currentResult: initial.result,
    entries,
    surveys: initial.manifest?.surveys ?? [],
    includeCurrent: currentEligible,
  });
  const loader = createAllRunsLoader({
    entries, manifestSource, assertResult: assertReportResult,
  });
  const overview = createCampusOverviewController({
    store, loader, floorInput, includeCurrent: currentEligible,
    includedResultIds: runSelection.selectedIds,
  });
  const rooms = createRoomResolutionLoader({
    resolveCampusRooms: surface.adapter?.resolveCampusRooms,
  });
  let roomLookupReady = false;
  let roomWork = null;
  let roomWorkAll = false;
  let roomWorkRevision = -1;
  let selectionRevision = 0;
  function mapAnalysis(mode, fallback) {
    const selected = overview.mapAnalysis(mode, fallback);
    if (mode === "overview" || rooms.status !== "ready") return selected;
    return analysisWithAreaResolution(selected, rooms.summary, rooms.summaries);
  }
  function bind(root, { refresh, status }) {
    root.querySelector("[data-load-overview]")?.addEventListener("click", async () => {
      await withRendering("Loading consolidated runs…", () =>
        loadOverview(refresh, root.querySelector("[data-overview-status]")));
    });
    bindAllRunsAction(root, { loader, status, refresh });
    runSelection.bind(root, ids => applyRunSelection(ids, refresh, status));
  }

  async function loadOverview(refresh, progress = null) {
    try {
      await overview.load((done, total) => {
        if (progress) progress.textContent = `Loading run ${done} of ${total}…`;
      });
      if (roomLookupReady) await resolveRooms(true, refresh);
      else await refresh();
      if (progress) progress.textContent = selectedCampusReportStatus(loader, runSelection);
      return overview.loaded;
    } catch (error) {
      if (progress) progress.textContent = error.message;
      return false;
    }
  }

  async function resolveRooms(all, refresh) {
    if (!roomLookupReady) return rooms.summary;
    if (roomWork) {
      if (roomWorkRevision === selectionRevision && (!all || roomWorkAll)) {
        return roomWork;
      }
      await roomWork;
    }
    const current = store.snapshot();
    const bundles = currentEligible && runSelection.includes(current.result.run.resultId)
      ? [{ result: current.result, exceptions: current.exceptions }] : [];
    if (all) bundles.push(...loader.records().filter(record => (
      runSelection.includes(record.result.run.resultId)
    )));
    const revision = selectionRevision;
    roomWorkAll = all;
    roomWorkRevision = revision;
    const work = withRendering("Resolving MazeMap room data…", () =>
      rooms.load(bundles)).then(summary => {
      if (revision === selectionRevision && rooms.status === "ready") {
        overview.setAreaResolutions(rooms.summaries);
      }
      return summary;
    });
    roomWork = work;
    void work.finally(() => {
      if (roomWork === work) {
        roomWork = null;
        roomWorkAll = false;
        roomWorkRevision = -1;
        if (revision === selectionRevision) refresh();
      }
    });
    refresh();
    return work;
  }

  async function applyRunSelection(ids, refresh, status) {
    const selectedIds = runSelection.apply(ids);
    if (!selectedIds) return false;
    selectionRevision += 1;
    overview.setIncludedResultIds(selectedIds);
    if (status) status.textContent = selectedCampusReportStatus(loader, runSelection);
    refresh();
    return roomLookupReady ? resolveRooms(true, refresh) : true;
  }

  return Object.freeze({
    allRunsState: state => collectionAllRunsState(loader, state),
    bind,
    loadOverview: (...args) => withRendering(
      "Loading consolidated runs…", () => loadOverview(...args)),
    mapAnalysis,
    overviewHtml: () => initial.consolidated
      ? overview.panelHtml({ priorityHtml: collectionRoomHtml(rooms, roomViewOptions) })
      : `${overview.panelHtml()}${collectionRoomHtml(rooms, roomViewOptions)}`,
    rebuild: overview.rebuild,
    runSelectionHtml: () => runSelection.html({ enabled: loader.loaded }),
    setIncludedRuns: applyRunSelection,
    roomHtml: () => collectionRoomHtml(rooms, roomViewOptions),
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
