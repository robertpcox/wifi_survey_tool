// FEATURE:      Consolidated overview presentation order
// SURFACE:      node --test src/features/report-player/report-collection-overview-order.test.mjs
// WHY TOGETHER: Pending and ready area results occupy one priority slot above run diagnostics.
// STATE:        One dynamic-room fixture with synthetic MazeMap polygons
// RULES:        Area results render once; direct report composition is unchanged.
// PROVENANCE:   Campus Overview room-first reporting

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { analyzeReportResult } from "../../domain/report-analysis.mjs";
import { createReportCollectionController } from "./report-collection-controller.mjs";

const fixture = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("pending area results occupy the room-first overview slot once", () => {
  const controller = makeController();
  const html = controller.overviewHtml();
  assert.ok(html.indexOf("MazeMap area resolution")
    < html.indexOf("Load and merge"));
  assert.equal(html.match(/MazeMap area resolution/g)?.length, 1);
});

test("ready room results precede run diagnostics without duplication", async () => {
  const controller = makeController();
  await controller.loadOverview(() => {});
  await controller.enableRoomLookup(() => {});
  const html = controller.overviewHtml();
  assert.ok(html.indexOf("Raw Cisco versus MazeMap areas")
    < html.indexOf("Positive Cisco lag behind route by run"));
  assert.equal(html.match(/Raw Cisco versus MazeMap areas/g)?.length, 1);
});

test("direct Campus overview keeps its existing diagnostic order", async () => {
  const controller = makeController(false);
  await controller.loadOverview(() => {});
  await controller.enableRoomLookup(() => {});
  const html = controller.overviewHtml();
  assert.ok(html.indexOf("Positive Cisco lag behind route by run")
    < html.indexOf("Raw Cisco versus MazeMap areas"));
});

function makeController(consolidated = true) {
  const result = structuredClone(fixture);
  result.run.captureMode = "dynamic-room";
  const analysis = analyzeReportResult(result, {
    stickySeconds: 2, accuracyM: 5, noPositionSeconds: 30,
  });
  const state = {
    result, analysis, consolidated,
    thresholds: analysis.thresholds, exceptions: [], manifest: { results: [] },
  };
  return createReportCollectionController({
    store: { snapshot: () => state },
    manifestSource: { result: async () => { throw new Error("unexpected"); } },
    surface: { adapter: { resolveCampusRooms: async points => (
      points.map(point => room(point.lng, point.lat, point.z))
    ) } },
  });
}

function room(lng, lat, z) {
  return { id: `${lng}:${lat}:${z}`, name: "Room", z,
    geometry: { type: "Polygon", coordinates: [[
      [lng - 1, lat - 1], [lng + 1, lat - 1], [lng + 1, lat + 1],
      [lng - 1, lat + 1], [lng - 1, lat - 1],
    ]] } };
}
