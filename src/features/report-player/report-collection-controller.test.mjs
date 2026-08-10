// FEATURE:      Consolidated report collection
// SURFACE:      node --test src/features/report-player/report-collection-controller.test.mjs
// WHY TOGETHER: Auto-load, exception-aware bundles, and room-map enrichment share one controller test.
// STATE:        Fixture store, manifest source, and room resolver
// RULES:        Campus overview and room evidence reuse one loaded result collection.
// PROVENANCE:   Campus-level consolidated report and dynamic dwell room evidence

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { createReportCollectionController } from "./report-collection-controller.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("collection autoloads campus runs and exposes overview map state", async () => {
  const other = structuredClone(result);
  other.run.resultId = "other";
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2, accuracyM: 5, noPositionSeconds: 30,
  });
  const state = {
    result, analysis, thresholds: analysis.thresholds, exceptions: [],
    manifest: { results: [{
      resultId: "other", campusId: result.run.campusId,
      completionStatus: "completed", exportedAt: result.run.exportedAt,
      path: "other.json", reviewedExceptions: [],
    }] },
  };
  const controller = createReportCollectionController({
    store: { snapshot: () => state },
    manifestSource: { result: async () => other },
    surface: { adapter: {} },
  });
  let refreshes = 0;
  assert.equal(await controller.loadOverview(() => { refreshes += 1; }), true);
  assert.equal(controller.overviewLoaded, true);
  assert.equal(controller.allRunsState(state).rows.length, 2);
  assert.equal(controller.mapAnalysis("overview", analysis).overview, true);
  assert.ok(refreshes > 0);
});

test("an all-run room request supersedes concurrent current-only work", async () => {
  const current = structuredClone(result);
  current.run.captureMode = "dynamic-room";
  const other = structuredClone(current);
  other.run.resultId = "other-dynamic";
  const analysis = analyzeReportResult(current, {
    stickySeconds: 2, accuracyM: 5, noPositionSeconds: 30,
  });
  const state = {
    result: current, analysis, thresholds: analysis.thresholds, exceptions: [],
    manifest: { results: [{
      resultId: other.run.resultId, campusId: current.run.campusId,
      completionStatus: "completed", exportedAt: current.run.exportedAt,
      path: "other.json", reviewedExceptions: [],
    }] },
  };
  let release;
  let first = true;
  const gate = new Promise(resolve => { release = resolve; });
  const controller = createReportCollectionController({
    store: { snapshot: () => state },
    manifestSource: { result: async () => other },
    surface: { adapter: { resolveRoomAt: async (lng, lat, z) => {
      if (first) { first = false; await gate; }
      return room(lng, lat, z);
    } } },
  });
  const currentWork = controller.enableRoomLookup(() => {});
  await Promise.resolve();
  const allWork = controller.loadOverview(() => {});
  release();
  await Promise.all([currentWork, allWork]);
  assert.equal(controller.roomSummary.visitCount, 4);
});

function room(lng, lat, z) {
  return { id: `${lng}:${lat}:${z}`, name: "Room", z,
    geometry: { type: "Polygon", coordinates: [[
      [lng - 1, lat - 1], [lng + 1, lat - 1], [lng + 1, lat + 1],
      [lng - 1, lat + 1], [lng - 1, lat - 1],
    ]] } };
}
