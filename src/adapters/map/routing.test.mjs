import test from "node:test";
import assert from "node:assert/strict";

import {
  fetchLegGeoJSON,
  getPoi,
  getPoiAt,
} from "./routing.mjs";

const fromPoi = {
  targetType: "poi",
  poiId: 11,
  lng: 170.1,
  lat: -45.1,
  z: 1,
};
const toPoi = {
  targetType: "poi",
  poiId: 22,
  lng: 170.2,
  lat: -45.2,
  z: 2,
};

test("POI routing uses pedestrian A-to-B parameters and clones features", async () => {
  const feature = {
    type: "Feature",
    properties: { z: 1 },
    geometry: { type: "LineString", coordinates: [[1, 2], [3, 4]] },
  };
  let parameters;
  const Mazemap = {
    Data: {
      async getAtoBTrip(value) {
        parameters = value;
        return { features: [feature] };
      },
      getRouteJSON: async () => assert.fail("unexpected route fallback"),
    },
  };

  const result = await fetchLegGeoJSON(
    Mazemap,
    fromPoi,
    toPoi,
    "campus-collection",
  );

  assert.deepEqual(parameters, {
    fromPoiId: 11,
    toPoiId: 22,
    mode: "PEDESTRIAN",
    constraint: "NONE",
    campusCollectionTag: "campus-collection",
  });
  assert.deepEqual(result, { type: "FeatureCollection", features: [feature] });
  assert.notEqual(result.features[0], feature);
  result.features[0].properties.z = 9;
  assert.equal(feature.properties.z, 1);
});

test("point routing and empty or failed trips fall back to getRouteJSON", async () => {
  const route = { type: "FeatureCollection", features: [{ id: "fallback" }] };
  const routeCalls = [];
  const warnings = [];
  const originalWarn = console.warn;
  console.warn = (...args) => warnings.push(args);
  try {
    for (const tripResult of [
      { features: [] },
      new Error("trip unavailable"),
    ]) {
      const Mazemap = {
        Data: {
          getAtoBTrip: async () => {
            if (tripResult instanceof Error) throw tripResult;
            return tripResult;
          },
          getRouteJSON: async (...args) => {
            routeCalls.push(args);
            return route;
          },
        },
      };
      assert.equal(await fetchLegGeoJSON(Mazemap, fromPoi, toPoi), route);
    }

    const pointMazemap = {
      Data: {
        getAtoBTrip: async () => assert.fail("point should not use POI routing"),
        getRouteJSON: async (...args) => {
          routeCalls.push(args);
          return route;
        },
      },
    };
    assert.equal(
      await fetchLegGeoJSON(
        pointMazemap,
        { ...fromPoi, targetType: "point" },
        toPoi,
      ),
      route,
    );
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(routeCalls.length, 3);
  assert.deepEqual(routeCalls[0], [
    { lngLat: { lng: 170.1, lat: -45.1 }, zLevel: 1 },
    { lngLat: { lng: 170.2, lat: -45.2 }, zLevel: 2 },
  ]);
  assert.equal(warnings.length, 2);
});

test("POI lookup wrappers preserve SDK arguments and results", async () => {
  const poiAt = { id: "at" };
  const poi = { id: "by-id" };
  const calls = [];
  const Mazemap = {
    Data: {
      getPoiAt: (...args) => {
        calls.push(["at", ...args]);
        return poiAt;
      },
      getPoi: (...args) => {
        calls.push(["id", ...args]);
        return poi;
      },
    },
  };

  assert.equal(getPoiAt(Mazemap, 170.5, -45.8, 3), poiAt);
  assert.equal(getPoi(Mazemap, 99), poi);
  assert.deepEqual(calls, [
    ["at", { lng: 170.5, lat: -45.8 }, 3],
    ["id", 99],
  ]);
});
