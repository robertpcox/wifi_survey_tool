import assert from "node:assert/strict";
import test from "node:test";

import { createRouteBuilder } from "./route-builder.mjs";

function stop(index) {
  return {
    label: `Stop ${index}`,
    lat: -36.85,
    lng: 174.76 + index * 0.0001,
    targetType: "point",
    z: 1,
  };
}

function routed(from, to) {
  return {
    features: [{
      geometry: {
        coordinates: [
          [from.lngLat.lng, from.lngLat.lat],
          [to.lngLat.lng, to.lngLat.lat],
        ],
        type: "LineString",
      },
      properties: { z: 1 },
    }],
    type: "FeatureCollection",
  };
}

async function until(check) {
  for (let turn = 0; turn < 20; turn++) {
    if (check()) return;
    await new Promise(resolve => setImmediate(resolve));
  }
  assert.fail("condition did not become true");
}

test("createRouteBuilder limits concurrency and preserves direct fallback", async () => {
  const routeState = {
    buildVersion: 0,
    legs: [],
    stops: [],
    waypoints: [],
  };
  const statuses = [];
  const renders = { route: [], stops: [], waypoints: [], info: [] };
  const view = {
    collapseMobileConfig() {},
    collectionTag: () => "private-campus",
    drawRoute: value => renders.route.push(value),
    drawStops: value => renders.stops.push(value),
    drawWaypoints: value => renders.waypoints.push(value),
    setRouteInfo: value => renders.info.push(value),
    setStatus: (...value) => statuses.push(value),
    spacing: () => 0,
  };
  const requests = [];
  let active = 0;
  let maximumActive = 0;
  const Mazemap = {
    Data: {
      getRouteJSON(from, to) {
        active++;
        maximumActive = Math.max(maximumActive, active);
        return new Promise((resolve, reject) => {
          requests.push({
            reject: error => {
              active--;
              reject(error);
            },
            resolve: value => {
              active--;
              resolve(value);
            },
            from,
            to,
          });
        });
      },
    },
  };
  const changes = [];
  const builder = createRouteBuilder({
    Mazemap,
    onRouteChanged: (_state, reason) => changes.push(reason),
    routeState,
    view,
  });
  assert.equal(await builder.buildRoute(), false);
  assert.deepEqual(statuses.at(-1), [
    "err",
    "Need at least 2 stops to build a route",
  ]);
  routeState.stops = Array.from({ length: 6 }, (_, index) => stop(index));
  const originalWarn = console.warn;
  const warnings = [];
  console.warn = (...args) => warnings.push(args);
  try {
    const build = builder.buildRoute();
    await until(() => requests.length === 4);
    assert.equal(active, 4);
    for (const request of requests.slice(0, 4)) {
      request.resolve(routed(request.from, request.to));
    }
    await until(() => requests.length === 5);
    requests[4].reject(new Error("offline"));
    assert.equal(await build, true);
  } finally {
    console.warn = originalWarn;
  }
  assert.equal(maximumActive, 4);
  assert.deepEqual(routeState.legs.map(leg => leg.mode), [
    "route", "route", "route", "route", "direct",
  ]);
  assert.equal(routeState.legs.length, 5);
  assert.equal(routeState.waypoints.length, 6);
  assert.equal(renders.route.at(-1), routeState.legs);
  assert.equal(renders.stops.at(-1), routeState.stops);
  assert.equal(renders.waypoints.at(-1), routeState.waypoints);
  assert.match(renders.info.at(-1), /1 leg\(s\) fell back to a straight line/);
  assert.match(statuses.at(-1)[1], /^Route built: 6 check-in points over /);
  assert.match(warnings[0][0], /Leg 4 routing failed/);
  assert.deepEqual(changes, ["route-built"]);
});
