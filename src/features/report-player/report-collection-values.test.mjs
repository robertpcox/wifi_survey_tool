// FEATURE:      Report collection projections
// SURFACE:      node --test src/features/report-player/report-collection-values.test.mjs
// WHY TOGETHER: Table, map, and selected-run status projections share compact fixtures.
// STATE:        Synthetic loader and analysis
// RULES:        Projection helpers remain immutable and selection-aware.
// PROVENANCE:   Campus report collection lifecycle

import assert from "node:assert/strict";
import test from "node:test";

import {
  analysisWithAreaResolution,
  campusReportStatus,
  collectionAllRunsState,
  selectedCampusReportStatus,
  collectionRoomHtml,
} from "./report-collection-values.mjs";

test("all-run state reads rows only after the loader completes", () => {
  const loader = {
    entryCount: 2, failureCount: 1, loaded: true,
    rows: (...args) => args,
  };
  const state = { result: {}, thresholds: {}, exceptions: [] };
  const value = collectionAllRunsState(loader, state);
  assert.equal(value.entryCount, 2);
  assert.equal(value.rows.length, 4);
  assert.equal(value.rows[0], state.result);
});

test("area enrichment clears generic room heat without mutating analysis", () => {
  const analysis = {
    floors: [{ z: 2 }], heatmaps: { room: [{ z: 2, points: [{ weight: 1 }] }] },
  };
  const summary = { runCount: 2 };
  const zone = { runCount: 1 };
  const enriched = analysisWithAreaResolution(analysis, summary, { room: summary, zone });
  assert.equal(enriched.areaResolution, summary);
  assert.equal(enriched.areaResolutions.room, summary);
  assert.equal(enriched.areaResolutions.zone, zone);
  assert.deepEqual(enriched.heatmaps.room[0].points, []);
  assert.equal(analysis.heatmaps.room[0].points.length, 1);
});

test("status distinguishes selected, eligible, and unavailable runs", () => {
  assert.equal(campusReportStatus(4, 11, 1),
    "Campus report · 4 of 11 eligible run(s) included · 1 selected run(s) unavailable");
  const selection = {
    selectedCount: 2, eligibleCount: 3, includes: id => id === "bad",
  };
  assert.equal(selectedCampusReportStatus({ failureIds: ["bad", "other"] }, selection),
    "Campus report · 2 of 3 eligible run(s) included · 1 selected run(s) unavailable");
});

test("collection room HTML renders independent room and zone outcomes", () => {
  const emptyCorridor = { sampleCount: 0, observations: [], corridors: [] };
  const room = { visitCount: 0, corridor: emptyCorridor };
  const zone = { observationCount: 0, visitCount: 0, corridor: emptyCorridor };
  const html = collectionRoomHtml({
    status: "ready", summary: room, summaries: { room, zone }, error: null,
  });
  assert.match(html, /MazeMap area resolution/);
  assert.match(html, /Zone match outcomes/);
  assert.match(html, /No eligible surveyed stops or walking checkpoints/);
});

test("collection pending state stays a single shared area lookup message", () => {
  const room = { visitCount: 0, corridor: { sampleCount: 0 } };
  const html = collectionRoomHtml({
    status: "loading", summary: room, summaries: { room, zone: room }, error: null,
  });
  assert.equal(html.match(/Resolving MazeMap polygons/g)?.length, 1);
  assert.doesNotMatch(html, /Zone match outcomes/);
});
