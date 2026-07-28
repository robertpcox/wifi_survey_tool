import test from "node:test";
import assert from "node:assert/strict";
import {
  describePoi,
  fetchCampusCatalog,
} from "./mazemap-catalog.mjs";

test("catalog uses a supplied center only when campus geometry is unavailable", async () => {
  assert.deepEqual(
    await fetchCampusCatalog({ Data: {} }, 566, [1, 2]),
    { buildings: [], floors: [], name: null, center: [1, 2] },
  );
  const catalog = await fetchCampusCatalog({
    Data: {
      async getCampus() {
        return {
          properties: { name: "Geometry Campus" },
          geometry: {
            coordinates: [[[[170, -46], [172, -46], [172, -44], [170, -44]]]],
          },
        };
      },
    },
  }, 566, [1, 2]);
  assert.deepEqual(catalog.center, [171, -45]);
  assert.equal(catalog.name, "Geometry Campus");
});

test("POI properties take precedence over campus catalog labels", () => {
  const poi = {
    geometry: { type: "Point", coordinates: [170.53, -45.83] },
    properties: {
      buildingId: 10,
      buildingName: "POI Building",
      floorId: 20,
      floorName: "POI Floor",
      zLevel: 4,
      poiId: 30,
      title: "Room 30",
    },
  };
  assert.deepEqual(describePoi(poi, 2, {
    buildings: [{ properties: { id: 10, name: "Catalog Building" } }],
    floors: [{ properties: { id: 20, z: 2, name: "Catalog Floor" } }],
  }), {
    building: { id: "10", name: "POI Building" },
    floor: { id: "20", z: 4, name: "POI Floor" },
    poi: {
      id: "30",
      name: "Room 30",
      center: { lng: 170.53, lat: -45.83, z: 4 },
    },
  });
});
