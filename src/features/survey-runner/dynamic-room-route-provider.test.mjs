// FEATURE:      Dynamic room background routing provider tests
// SURFACE:      Injected and MazeMap route providers
// WHY TOGETHER: Lazy SDK access, exact endpoints, and missing geometry define one boundary.
// STATE:        Stub MazeMap Data route response
// RULES:        No provider failure can become fabricated direct geometry.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import assert from "node:assert/strict";
import test from "node:test";
import { resolveDynamicRoomRouteProvider }
  from "./dynamic-room-route-provider.mjs";

const from = { id: "stop-1", lng: 170.5, lat: -45.8, z: 1 };
const to = { id: "stop-2", lng: 170.6, lat: -45.9, z: 1 };

test("an injected provider remains the explicit test/runtime seam", () => {
  const injected = async () => [from, to];
  assert.equal(resolveDynamicRoomRouteProvider({
    routeProvider: injected,
  }), injected);
});

test("MazeMap route response becomes exact ordered geometry", async () => {
  const calls = [];
  const provider = resolveDynamicRoomRouteProvider({
    mapAdapter: {
      Mazemap: {
        Data: {
          async getRouteJSON(...args) {
            calls.push(args);
            return {
              type: "FeatureCollection",
              features: [{
                properties: { z: 1 },
                geometry: {
                  type: "LineString",
                  coordinates: [
                    [from.lng, from.lat],
                    [170.55, -45.85],
                    [to.lng, to.lat],
                  ],
                },
              }],
            };
          },
        },
      },
    },
  });
  assert.deepEqual(await provider(from, to), [
    { lng: from.lng, lat: from.lat, z: 1 },
    { lng: 170.55, lat: -45.85, z: 1 },
    { lng: to.lng, lat: to.lat, z: 1 },
  ]);
  assert.deepEqual(calls[0], [
    { lngLat: { lng: from.lng, lat: from.lat }, zLevel: 1 },
    { lngLat: { lng: to.lng, lat: to.lat }, zLevel: 1 },
  ]);
});

test("routing before map engagement fails instead of drawing a line", async () => {
  const provider = resolveDynamicRoomRouteProvider({ mapAdapter: {} });
  await assert.rejects(provider(from, to), /unavailable before preflight/);
});
