// FEATURE:      Report collection projections
// SURFACE:      Collection table, map, status, and room-view projection helpers
// WHY TOGETHER: Projections keep async collection orchestration below the file-size boundary.
// STATE:        None
// RULES:        Never mutate analysis, loader records, room state, or run selection.
// PROVENANCE:   Campus report collection lifecycle

import { renderRoomResolutionView } from "./room-resolution-view.mjs";

export function collectionAllRunsState(loader, state) {
  return {
    entryCount: loader.entryCount,
    loaded: loader.loaded,
    failureCount: loader.failureCount,
    rows: loader.loaded
      ? loader.rows(state.result, state.thresholds, undefined, state.exceptions)
      : [],
  };
}

export function analysisWithAreaResolution(analysis, summary) {
  return {
    ...analysis,
    areaResolution: summary,
    heatmaps: {
      ...analysis.heatmaps,
      room: analysis.floors.map(floor => ({ ...floor, points: [] })),
    },
  };
}

export function campusReportStatus(selected, eligible, unavailable = 0) {
  return `Campus report · ${selected} of ${eligible} eligible run(s) included${unavailable
    ? ` · ${unavailable} selected run(s) unavailable` : ""}`;
}

export function selectedCampusReportStatus(loader, selection) {
  const unavailable = (loader.failureIds ?? [])
    .filter(id => selection.includes(id)).length;
  return campusReportStatus(
    selection.selectedCount, selection.eligibleCount, unavailable,
  );
}

export function collectionRoomHtml(rooms, { showDevice = true } = {}) {
  return renderRoomResolutionView({
    status: rooms.status,
    summary: rooms.summary,
    error: rooms.error,
    showDevice,
  });
}
