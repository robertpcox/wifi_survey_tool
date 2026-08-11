// FEATURE:      Common-area corridor resolution
// SURFACE:      node --test src/features/report-player/room-resolution-common-area.test.mjs
// WHY TOGETHER: Truth priority, raw room masking, and scoring form one local-only contract.
// STATE:        Synthetic floor, room, hole, and MultiPolygon geometry
// RULES:        Corridors may use floor truth; dwell targets remain named-room only.
// PROVENANCE:   Consolidated long-corridor resolution

import assert from "node:assert/strict";
import test from "node:test";

import { scoreRoomMoment } from "../../domain/report-room-resolution.mjs";
import {
  expectedCatalogRoom, knownRoomIndex, observedKnownRoom,
} from "./room-resolution-catalog.mjs";

const floor = area("floor:1:common", "common-area", square(0, 0, 10), 0);
const clinic = area("clinic", "room", square(2, 2, 2), 0);
const catalog = [floor, clinic];

test("corridor truth searches named rooms before floor common area", () => {
  assert.equal(expectedCatalogRoom(corridor(3, 3, 0), catalog).id, "clinic");
  assert.equal(expectedCatalogRoom(corridor(6, 6, 0), catalog).id, "floor:1:common");
  assert.equal(expectedCatalogRoom({
    ...corridor(6, 6, 0), observationKind: "dwell",
  }, catalog), null, "a dwell target cannot fall back to a floor outline");
});

test("raw common-area matching masks named rooms before accepting the floor", () => {
  const prepared = [{ expected: floor }];
  const index = knownRoomIndex(prepared, catalog);
  const inCommon = observedKnownRoom(point(6, 6, 0), floor, index).room;
  const inRoom = observedKnownRoom(point(3, 3, 0), floor, index).room;
  const outside = observedKnownRoom(point(12, 12, 0), floor, index).room;
  assert.equal(inCommon.id, floor.id);
  assert.equal(inRoom.id, clinic.id);
  assert.equal(outside, null);
  assert.equal(score(floor, inCommon, point(6, 6, 0)).status, "resolved");
  const wrongRoom = score(floor, inRoom, point(3, 3, 0));
  assert.equal(wrongRoom.status, "wrong-room");
  assert.equal(wrongRoom.room.id, "clinic");
  assert.equal(wrongRoom.outsideDistanceM, null);
  assert.equal(score(floor, outside, point(12, 12, 0)).status, "unresolved");
});

test("room failures identify a common-area destination and preserve its type", () => {
  const index = knownRoomIndex([{ expected: clinic }], catalog);
  const observed = observedKnownRoom(point(6, 6, 0), clinic, index).room;
  const result = score(clinic, observed, point(6, 6, 0));
  assert.equal(observed.id, floor.id);
  assert.equal(result.status, "wrong-room");
  assert.equal(result.room.areaKind, "common-area");
  assert.equal(result.room.buildingId, "9");
});

test("floor holes and other floors are not accepted as common truth", () => {
  const hole = area("floor:hole:common", "common-area", {
    type: "Polygon", coordinates: [
      square(0, 0, 10).coordinates[0], square(4, 4, 2).coordinates[0],
    ],
  }, 0);
  assert.equal(expectedCatalogRoom(corridor(5, 5, 0), [hole]), null);
  const wrongFloor = score(floor, null, point(6, 6, 1));
  assert.equal(wrongFloor.status, "wrong-floor");
});

test("MultiPolygon floor outlines provide common truth in either component", () => {
  const multi = area("floor:multi:common", "common-area", {
    type: "MultiPolygon", coordinates: [
      square(0, 0, 2).coordinates, square(10, 10, 2).coordinates,
    ],
  }, 2);
  assert.equal(expectedCatalogRoom(corridor(11, 11, 2), [multi]).id, multi.id);
});

function corridor(lng, lat, z) {
  return { observationKind: "corridor-point", target: point(lng, lat, z) };
}

function score(expected, observed, evidencePoint) {
  return scoreRoomMoment({ evidence: { point: evidencePoint }, expected, observed });
}

function point(lng, lat, z) { return { lng, lat, z }; }

function area(id, areaKind, geometry, z) {
  return { id, areaKind, geometry, z, buildingId: "9", floorId: "1", name: id };
}

function square(lng, lat, size) {
  return { type: "Polygon", coordinates: [[
    [lng, lat], [lng + size, lat], [lng + size, lat + size],
    [lng, lat + size], [lng, lat],
  ]] };
}
