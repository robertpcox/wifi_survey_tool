// FEATURE:      MazeMap floor-outline common areas
// SURFACE:      node --test src/adapters/map/mazemap-floor-area.test.mjs
// WHY TOGETHER: Provider schema normalization and building filtering share one contract.
// STATE:        Synthetic SDK campus catalogue
// RULES:        Bulk POIs are rooms; floor outlines are typed scoring-only common areas.
// PROVENANCE:   Consolidated long-corridor resolution

import assert from "node:assert/strict";
import test from "node:test";

import { normalizeMazeMapFloorAreas } from "./mazemap-floor-area.mjs";
import { loadMazeMapRoomCatalog } from "./mazemap-room-catalog.mjs";

test("official floor schema becomes a typed common area for the selected building", () => {
  const polygon = square(0, 0, 10);
  const multi = { type: "MultiPolygon", coordinates: [square(20, 20, 2).coordinates] };
  const areas = normalizeMazeMapFloorAreas({ features: [
    feature(101, 9, 0, "Ground", polygon),
    feature(102, 9, 1, "First", multi),
    feature(201, 10, 0, "Other", polygon),
  ] }, [9]);
  assert.deepEqual(areas.map(area => ({
    id: area.id, areaKind: area.areaKind, floorId: area.floorId,
    buildingId: area.buildingId, z: area.z, name: area.name,
    geometryType: area.geometry.type,
  })), [{
    id: "floor:101:common", areaKind: "common-area", floorId: "101",
    buildingId: "9", z: 0, name: "Ground common area", geometryType: "Polygon",
  }, {
    id: "floor:102:common", areaKind: "common-area", floorId: "102",
    buildingId: "9", z: 1, name: "First common area", geometryType: "MultiPolygon",
  }]);
});

test("bulk catalogue returns tagged rooms plus floor truth without another API call", async () => {
  let calls = 0;
  const catalog = {
    buildings: [{ properties: { id: 9 } }],
    floors: [feature(101, 9, 0, "Ground", square(0, 0, 10))],
  };
  const areas = await loadMazeMapRoomCatalog({
    sdk: { Data: { async getPois() {
      calls += 1;
      return [feature(501, 9, 0, "Clinic", square(1, 1, 1), true)];
    } } },
    catalog, campusId: 566,
  });
  assert.equal(calls, 1);
  assert.deepEqual(areas.map(area => [area.id, area.areaKind, area.buildingId]), [
    ["501", "room", "9"], ["floor:101:common", "common-area", "9"],
  ]);
});

function feature(id, buildingId, z, name, geometry, poi = false) {
  return { type: "Feature", id, properties: {
    [poi ? "poiId" : "id"]: id, buildingId, campusId: 566,
    [poi ? "zLevel" : "z"]: z, name,
  }, geometry };
}

function square(lng, lat, size) {
  return { type: "Polygon", coordinates: [[
    [lng, lat], [lng + size, lat], [lng + size, lat + size],
    [lng, lat + size], [lng, lat],
  ]] };
}
