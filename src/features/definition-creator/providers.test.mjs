import assert from "node:assert/strict";
import test from "node:test";

import { resolveCreatorProviders } from "./providers.mjs";

const from = { name: "Start", lng: 170.5, lat: -45.87, z: 0 };
const to = { name: "Finish", lng: 170.51, lat: -45.88, z: 1 };

test("explicit Creator providers remain the injected boundaries", () => {
  const routeProvider = () => [];
  const lookupPoi = () => ({});
  assert.deepEqual(
    resolveCreatorProviders({ routeProvider, lookupPoi }),
    { routeProvider, lookupPoi },
  );
});

test("MazeMap fallback normalizes an exact route and POI lookup", async () => {
  const calls = [];
  const poi = { id: 42 };
  const Mazemap = {
    Data: {
      getPoi: async id => {
        calls.push(["poi", id]);
        return poi;
      },
      getRouteJSON: async (...args) => {
        calls.push(["route", ...args]);
        return {
          features: [{
            properties: { z: 0 },
            geometry: {
              type: "LineString",
              coordinates: [[170.501, -45.871], [170.509, -45.879]],
            },
          }],
        };
      },
    },
  };
  const providers = resolveCreatorProviders({ Mazemap });
  assert.equal(await providers.lookupPoi("42"), poi);
  const geometry = await providers.routeProvider(from, to);
  assert.deepEqual(geometry[0], { lng: from.lng, lat: from.lat, z: from.z });
  assert.deepEqual(geometry.at(-1), { lng: to.lng, lat: to.lat, z: to.z });
  assert.deepEqual(calls[1].slice(1), [
    { lngLat: { lng: from.lng, lat: from.lat }, zLevel: from.z },
    { lngLat: { lng: to.lng, lat: to.lat }, zLevel: to.z },
  ]);
});

test("no MazeMap keeps providers optional for direct SVG authoring", () => {
  assert.deepEqual(resolveCreatorProviders(), {
    lookupPoi: undefined,
    routeProvider: undefined,
  });
});

test("MazeMap provider preserves POI-centre routing through the shared adapter", async () => {
  let parameters;
  const Mazemap = {
    Data: {
      getAtoBTrip: async value => {
        parameters = value;
        return {
          features: [{
            properties: { z: 0 },
            geometry: {
              type: "LineString",
              coordinates: [[170.5, -45.87], [170.51, -45.88]],
            },
          }],
        };
      },
      getRouteJSON: async () => assert.fail("unexpected point fallback"),
    },
  };
  const provider = resolveCreatorProviders({ Mazemap }).routeProvider;
  await provider(
    { ...from, poiId: "11", provenance: { method: "poi" } },
    { ...to, poiId: "22", provenance: { method: "poi" } },
  );
  assert.deepEqual(parameters, {
    fromPoiId: "11",
    toPoiId: "22",
    mode: "PEDESTRIAN",
    constraint: "NONE",
  });
});
