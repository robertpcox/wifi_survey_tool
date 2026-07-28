import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createCreator } from "./creator.mjs";

function makeDocument() {
  const ids = [
    "addPoiId", "collectionTag", "loadRouteBtn", "routeFile", "routeInfo",
    "routeName", "savedRoutes", "statusText", "stopList", "targetChoice",
    "targetChoiceCopy", "targetOutdoorsOption", "targetPoiOption",
    "targetPoiSummary", "targetPointSummary", "targetPointTitle", "wpSpacing",
  ];
  const elements = Object.fromEntries(ids.map(id => [
    id,
    {
      disabled: false,
      hidden: true,
      innerHTML: "",
      style: {},
      textContent: "",
      value: "",
    },
  ]));
  elements.wpSpacing.value = "0";
  return {
    defaultView: { matchMedia: () => ({ matches: false }) },
    elements,
    getElementById: id => elements[id],
    querySelector: () => ({ open: true }),
  };
}

function stop(label, lng) {
  return {
    label,
    lng,
    lat: -36.85,
    locationType: "unknown",
    poi: null,
    z: 1,
    poiId: null,
    poiName: null,
    tag: label,
    targetType: "point",
  };
}

test("createCreator preserves its public action surface and composed flow", async () => {
  const documentRef = makeDocument();
  const routeState = {
    buildVersion: 0,
    legs: [],
    loadBusy: false,
    selectionVersion: 1,
    stops: [stop("A", 174.76), stop("B", 174.761)],
    waypoints: [],
  };
  const draws = { route: [], stops: [], waypoints: [] };
  const mapAdapter = {
    ready: true,
    drawRoute: value => draws.route.push(value),
    drawStops: value => draws.stops.push(value),
    drawWaypoints: value => draws.waypoints.push(value),
  };
  const repository = {
    deleteRoute() {},
    loadServerRoute: async () => ({}),
    loadServerRouteManifest: async () => [],
    saveRoute() {},
    savedRouteMap: () => ({}),
  };
  const Mazemap = {
    Data: {
      getRouteJSON: async (from, to) => ({
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
      }),
    },
  };
  const downloads = [];
  const statuses = [];
  const creator = createCreator({
    Mazemap,
    documentRef,
    downloadFile: (...args) => downloads.push(args),
    mapAdapter,
    now: () => new Date("2026-07-28T00:00:00.000Z"),
    repository,
    routeState,
    setStatus: (...args) => statuses.push(args),
  });
  assert.deepEqual(Object.keys(creator.actions), [
    "addStopFromInput", "buildRoute", "chooseMapTarget", "clearStops",
    "closeTargetChoice", "deleteRoute", "exportRoute", "importRoute",
    "loadRoute", "moveStop", "removeStop", "saveRoute",
  ]);
  assert.equal(typeof creator.onMapClick, "function");
  await creator.initialize();
  assert.equal(routeState.legs.length, 1);
  assert.equal(routeState.waypoints.length, 2);
  assert.equal(draws.route.at(-1), routeState.legs);
  documentRef.elements.routeName.value = "Known route";
  creator.actions.exportRoute();
  assert.equal(downloads[0][0], "route-Known-route.json");
  assert.deepEqual(JSON.parse(downloads[0][1]), {
    campusId: 566,
    exportedAt: "2026-07-28T00:00:00.000Z",
    kind: "route",
    name: "Known route",
    stops: routeState.stops,
    tool: "route_survey",
    version: 2,
  });
  assert.match(statuses.at(-1)[1], /Exported route "Known route"/);
  const css = await readFile(new URL("./creator.css", import.meta.url), "utf8");
  for (const selector of [
    ".target-choice", ".target-choice[hidden]", ".target-option[hidden]",
    ".stop-list", ".stop-item .kind", "@media (max-width: 700px)",
  ]) {
    assert.ok(css.includes(selector), `missing Creator selector ${selector}`);
  }
});
