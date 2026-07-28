import assert from "node:assert/strict";
import test from "node:test";
import { createDefinitionCreatorController } from "./controller.mjs";
function harness() {
  const calls = { failRoute: false, map: [], shortWarnings: [], statuses: [] };
  const fields = validFields();
  const view = {
    chooseImport() {},
    readFields: () => fields,
    renderCoverage() {},
    renderRoute() {},
    renderStops() {},
    selectStop() {},
    setEngaged() {},
    setPlanLocked(value) {
      calls.planLocked = value;
    },
    setStatus(message, kind) {
      calls.statuses.push([message, kind]);
    },
    showGpsWarning(message) {
      calls.gpsWarning = message;
    },
    showShortWarning(message) {
      calls.shortWarnings.push(message);
    },
  };
  const route = {
    checkpoints: [
      { id: "checkpoint-1", sequence: 1, type: "intermediate", dwellSeconds: 5 },
    ],
    distanceM: 8,
    duration: { walkingSeconds: 8, dwellSeconds: 5, totalSeconds: 13 },
    legs: [{
      id: "leg-1",
      fromStopId: "stop-1",
      toStopId: "stop-2",
      distanceM: 8,
      geometry: [],
    }],
    shortLegs: [{
      fromStopId: "stop-1",
      toStopId: "stop-2",
      distanceM: 8,
    }],
  };
  const workflow = {
    rebuild: async stops => {
      calls.rebuilds = (calls.rebuilds ?? 0) + 1;
      if (calls.failRoute && stops.length > 1) throw new Error("provider offline");
      return stops.length < 2
        ? { ...route, checkpoints: [], distanceM: 0, legs: [], shortLegs: [] }
        : route;
    },
  };
  const stopActions = {
    adjust: (_values, stop) => ({ ...stop, name: "Adjusted" }),
    exact: (_values, id) => ({
      id,
      name: id === "stop-1" ? "Start" : "Finish",
      lng: 1,
      lat: 2,
      z: 0,
      locationType: "room",
      provenance: { method: "map" },
    }),
  };
  const mapAdapter = {
    campusId: "campus-a",
    drawRoute: value => calls.map.push(["route", value]),
    drawStops: value => calls.map.push(["stops", value]),
    drawWaypoints: value => calls.map.push(["checkpoints", value]),
  };
  const controller = createDefinitionCreatorController({
    mapAdapter,
    stopActions,
    view,
    workflow,
  });
  controller.engage({ campusId: "campus-a" });
  return { calls, fields, controller };
}
test("controller locks planning and live-routes every added or reordered stop", async () => {
  const { calls, controller, fields } = harness();
  fields.surveyName = "";
  fields.configId = "";
  await controller.dispatch("add-exact");
  assert.equal(controller.state.planLocked, true);
  assert.equal(controller.state.stops.length, 1);
  await controller.dispatch("add-exact");
  assert.equal(controller.state.stops.length, 2);
  assert.equal(controller.state.route.distanceM, 8);
  assert.match(calls.shortWarnings.at(-1), /Start → Finish/);
  await controller.dispatch("add-exact");
  await controller.dispatch("select-stop", { dataset: { index: "1" } });
  const rebuilds = calls.rebuilds;
  await controller.dispatch("move-stop-down", { dataset: { index: "1" } });
  assert.equal(calls.rebuilds, rebuilds + 1);
  assert.deepEqual(controller.state.stops.map(stop => stop.id),
    ["stop-1", "stop-3", "stop-2"]);
  assert.equal(controller.state.selectedIndex, 2);
  const drawn = calls.map.filter(call => call[0] === "stops").at(-1)[1];
  assert.deepEqual(drawn.map(stop => stop.id), ["stop-1", "stop-3", "stop-2"]);
  await controller.dispatch("lock-plan");
  assert.equal(controller.state.planLocked, false);
  fields.spacingM = 12;
  await controller.dispatch("add-exact");
  assert.equal(controller.state.plan.spacingM, 12);
});
test("short-leg dismissal lasts for subsequent route renders", async () => {
  const { calls, controller } = harness();
  await controller.dispatch("lock-plan");
  await controller.dispatch("add-exact");
  await controller.dispatch("add-exact");
  await controller.dispatch("dismiss-short-warning");
  await controller.dispatch("move-stop-down", { dataset: { index: "0" } });
  assert.equal(controller.state.shortWarningDismissed, true);
  assert.equal(calls.shortWarnings.at(-1), null);
});
test("a routing failure leaves the visible route and stops unchanged", async () => {
  const { calls, controller } = harness();
  await controller.dispatch("lock-plan");
  await controller.dispatch("add-exact");
  calls.failRoute = true;
  await controller.dispatch("add-exact");
  assert.equal(controller.state.stops.length, 1);
  assert.equal(controller.state.route.distanceM, 0);
  assert.match(calls.statuses.at(-1)[0], /provider offline/);
});
function validFields() {
  return {
    surveyName: "Survey A",
    customerId: "customer-a",
    customerName: "Customer A",
    campusId: "campus-a",
    campusName: "Campus A",
    timezone: "Australia/Melbourne",
    routeId: "route-a",
    positionSourceId: "mazemap-cloud",
    configId: "1",
    pollIntervalMs: 2000,
    proxyBase: "/proxy",
    spacingM: 10,
    midLegDwellSeconds: 5, legEndDwellSeconds: 30,
  };
}
