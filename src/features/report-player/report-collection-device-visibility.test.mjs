// FEATURE:      Problem-area device visibility
// SURFACE:      node --test src/features/report-player/report-collection-device-visibility.test.mjs
// WHY TOGETHER: Direct and consolidated collection views share one renderer with different disclosure.
// STATE:        Loaded current result with synthetic MazeMap room lookup
// RULES:        Direct evidence keeps device identity; consolidated Problem Areas omits it.
// PROVENANCE:   Consolidated report presentation cleanup

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { createReportCollectionController } from "./report-collection-controller.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("only consolidated Problem Areas omits device identity", async () => {
  const direct = await roomHtml(false);
  const consolidated = await roomHtml(true);
  assert.match(direct, /<th>Device<\/th>/);
  assert.doesNotMatch(consolidated, /<th>Device<\/th>/);
});

async function roomHtml(consolidated) {
  const result = structuredClone(fixture);
  result.run.captureMode = "dynamic-room";
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2, accuracyM: 5, noPositionSeconds: 30,
  });
  const state = {
    result, analysis, consolidated, thresholds: analysis.thresholds,
    exceptions: [], manifest: { results: [] },
  };
  const controller = createReportCollectionController({
    store: { snapshot: () => state },
    manifestSource: { result: async () => { throw new Error("unexpected"); } },
    surface: { adapter: { resolveRoomAt: async (lng, lat, z) => room(lng, lat, z) } },
  });
  await controller.enableRoomLookup(() => {});
  return controller.roomHtml();
}

function room(lng, lat, z) {
  return { id: "room", name: "Room", z, geometry: {
    type: "Polygon", coordinates: [[
      [lng - 1, lat - 1], [lng + 1, lat - 1], [lng + 1, lat + 1],
      [lng - 1, lat + 1], [lng - 1, lat - 1],
    ]],
  } };
}
