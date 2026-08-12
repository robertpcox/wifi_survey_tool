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

export function analysisWithAreaResolution(analysis, summary, summaries = null) {
  const areaResolutions = summaries ?? { room: summary, zone: null };
  return {
    ...analysis,
    areaResolution: summary,
    areaResolutions,
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
  const roomHtml = renderRoomResolutionView({
    status: rooms.status,
    summary: rooms.summary,
    error: rooms.error,
    showDevice,
  });
  const zone = rooms.summaries?.zone ?? rooms.zoneSummary;
  if (rooms.status !== "ready" || !zone) return roomHtml;
  return `${roomHtml}${renderRoomResolutionView({
    status: rooms.status,
    summary: zone,
    error: rooms.error,
    showDevice,
    areaKind: "zone",
  })}`;
}
