// FEATURE:      Room versus zone area resolution
// SURFACE:      node --test src/features/report-player/room-zone-resolution.test.mjs
// WHY TOGETHER: Nested catalogue matching and one-fetch dual scoring form one contract.
// STATE:        Synthetic provider polygons and one dynamic result fixture
// RULES:        Room excludes exact zones; zone includes only zones; both reuse one catalogue.
// PROVENANCE:   Consolidated MazeMap room/zone area-resolution selector

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  expectedCatalogRoom, knownRoomIndex, observedKnownRoom,
} from "./room-resolution-catalog.mjs";
import { createRoomResolutionLoader } from "./room-resolution-loader.mjs";

const source = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("nested zones never steal room matches and zone matching stays zone-only", () => {
  const parent = area("room", 1, "room", 1);
  const nested = area("zone", 1, "zone", 0.25);
  const corridor = area("corridor", 1, "circulation_room", 0.5);
  const target = { lng: 1, lat: 1, z: 0 };
  assert.equal(expectedCatalogRoom({ target }, [parent, nested]).id, "room");
  assert.equal(expectedCatalogRoom({ target }, [parent, nested], "zone").id, "zone");
  assert.equal(expectedCatalogRoom({ target, expectedPoiId: "zone" },
    [parent, nested]).id, "room", "captured zone id cannot override room mode");
  assert.equal(expectedCatalogRoom({ target }, [corridor, nested]).id, "corridor");
  assert.equal(observedKnownRoom(target, parent,
    knownRoomIndex([], [parent, nested], "room")).room.id, "room");
  assert.equal(observedKnownRoom(target, nested,
    knownRoomIndex([], [parent, nested], "zone"), "zone").room.id, "zone");
  assert.equal(expectedCatalogRoom({ target: { lng: 4, lat: 4, z: 0 } },
    [nested], "zone"), null, "zone mode has no common-area fallback");
});

test("one bulk catalogue produces independent room and zone summaries", async () => {
  const result = structuredClone(source);
  result.run.captureMode = "dynamic-room";
  result.route.checkpoints[0].dwellSeconds = 6;
  const target = result.checkIns[0].groundTruth;
  let calls = 0;
  const loader = createRoomResolutionLoader({ resolveCampusRooms: async () => {
    calls += 1;
    return [
      area("parent-room", target.lng, "room", 0.001, target.lat, target.z),
      area("nested-zone", target.lng, "zone", 0.0005, target.lat, target.z),
    ];
  } });
  const roomSummary = await loader.load([{ result, exceptions: [] }]);
  assert.equal(roomSummary.observations[0].expectedRoom.id, "parent-room");
  assert.equal(loader.summary, loader.roomSummary, "legacy summary remains room mode");
  assert.equal(loader.summaryFor("zone"), loader.zoneSummary);
  assert.equal(loader.zoneSummary.observations[0].expectedRoom.id, "nested-zone");
  assert.equal(loader.roomSummary.observations[0].expectedRoom.kind, "room");
  assert.equal(loader.zoneSummary.observations[0].expectedRoom.kind, "zone");
  await loader.load([{ result, exceptions: [] }]);
  assert.equal(calls, 1, "both modes and later rescoring reuse one catalogue fetch");
});

test("zone summaries omit surveyed points that are not inside a zone", async () => {
  const result = structuredClone(source);
  const target = result.checkIns[0].groundTruth;
  const loader = createRoomResolutionLoader({ resolveCampusRooms: async () => [
    area("parent-room", target.lng, "room", 0.001, target.lat, target.z),
    area("far-zone", target.lng + 1, "zone", 0.001, target.lat, target.z),
  ] });
  await loader.load([{ result, exceptions: [] }]);
  assert.ok(loader.roomSummary.observationCount > 0);
  assert.equal(loader.zoneSummary.observationCount, 0);
  assert.equal(loader.zoneSummary.unscoredVisitCount, 0);
});

function area(id, lng, kind, radius, lat = 1, z = 0) {
  return { id, name: id, z, kind, areaKind: kind === "zone" ? "zone" : "room",
    geometry: { type: "Polygon", coordinates: [[
      [lng - radius, lat - radius], [lng + radius, lat - radius],
      [lng + radius, lat + radius], [lng - radius, lat + radius],
      [lng - radius, lat - radius],
    ]] } };
}
