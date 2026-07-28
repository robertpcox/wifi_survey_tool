import assert from "node:assert/strict";
import test from "node:test";

import { createRouteEditor } from "./route-editor.mjs";

function rawStop(label, lng = 174.76) {
  return {
    label,
    lat: -36.85,
    lng,
    poiId: null,
    poiName: null,
    targetType: "point",
    z: 1,
  };
}

test("createRouteEditor preserves map choices and edit invalidation", async () => {
  const routeState = {
    buildVersion: 2,
    legs: [{ mode: "route" }],
    selectionVersion: 4,
    stops: [],
    waypoints: [{ id: 1 }],
  };
  const calls = {
    close: 0,
    location: [],
    names: [],
    route: [],
    routeInfo: [],
    statuses: [],
    stops: [],
    target: [],
    waypoints: [],
  };
  const view = {
    closeTargetChoice: () => calls.close++,
    drawRoute: value => calls.route.push(value),
    drawStops: value => calls.stops.push(value),
    drawWaypoints: value => calls.waypoints.push(value),
    renderStops: value => calls.stops.push(value),
    setRouteInfo: value => calls.routeInfo.push(value),
    setRouteName: value => calls.names.push(value),
    setStatus: (...value) => calls.statuses.push(value),
    showLocationChoice: value => calls.location.push(value),
    showTargetChoice: (...value) => calls.target.push(value),
    stopInput: () => ({ value: "" }),
  };
  let blocked = false;
  let poiCalls = 0;
  const Mazemap = {
    Data: {
      getPoiAt: async () => {
        poiCalls++;
        if (poiCalls > 1) throw new Error("lookup unavailable");
        return {
          point: { coordinates: [174.761, -36.851] },
          properties: { poiId: 42, title: "Library", zLevel: 3 },
        };
      },
    },
  };
  const reasons = [];
  const editor = createRouteEditor({
    Mazemap,
    isRouteEditingBlocked: () => blocked,
    mapAdapter: { getMapZLevel: () => 3, ready: true },
    onRouteChanged: (_state, reason) => reasons.push(reason),
    routeState,
    view,
  });
  blocked = true;
  await editor.onMapClick({ lngLat: { lat: -36.852, lng: 174.762 } });
  assert.equal(poiCalls, 0);
  blocked = false;
  await editor.onMapClick({ lngLat: { lat: -36.852, lng: 174.762 } });
  assert.equal(calls.target.length, 1);
  editor.actions.chooseMapTarget("point");
  assert.equal(routeState.stops.length, 1);
  assert.equal(routeState.stops[0].targetType, "point");
  assert.equal(routeState.stops[0].poiId, 42);
  assert.deepEqual(routeState.legs, []);
  assert.deepEqual(routeState.waypoints, []);
  assert.equal(routeState.buildVersion, 3);
  assert.match(calls.statuses.at(-1)[1], /exact point in “Library”/);
  await editor.onMapClick({ lngLat: { lat: -36.853, lng: 174.763 } });
  assert.equal(calls.location.length, 1);
  editor.actions.chooseMapTarget("outdoors");
  assert.equal(routeState.stops[1].locationType, "outdoors");
  assert.equal(routeState.stops[1].z, 3);
  editor.actions.moveStop(1, -1);
  assert.equal(routeState.stops[0].locationType, "outdoors");
  editor.actions.moveStop(0, -1);
  assert.equal(routeState.stops[0].locationType, "outdoors");
  editor.actions.removeStop(0);
  assert.equal(routeState.stops.length, 1);
  editor.addRouteStop(rawStop("Direct", 174.764));
  assert.equal(routeState.stops.at(-1).tag, "B");
  editor.applyRoute([rawStop("Loaded")], "Loaded route", false);
  assert.equal(routeState.selectionVersion, 4);
  assert.equal(calls.names.at(-1), "Loaded route");
  editor.applyRoute([rawStop("Selected")], "Selected route");
  assert.equal(routeState.selectionVersion, 5);
  editor.clearRouteForLoad();
  assert.equal(routeState.selectionVersion, 0);
  assert.deepEqual(routeState.stops, []);
  assert.equal(calls.names.at(-1), "");
  editor.actions.clearStops();
  assert.deepEqual(routeState.stops, []);
  assert.ok(reasons.includes("stop-added"));
  assert.ok(reasons.includes("stop-moved"));
  assert.ok(reasons.includes("stop-removed"));
  assert.ok(reasons.includes("route-loaded"));
  assert.ok(reasons.includes("route-load-cleared"));
  assert.ok(reasons.includes("stops-cleared"));
});
