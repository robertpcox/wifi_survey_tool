import assert from "node:assert/strict";
import test from "node:test";

import { mountDefinitionCreator } from "./definition-creator.mjs";

function seams() {
  const calls = { statuses: [] };
  const view = {
    onAction(handler) {
      calls.actionHandler = handler;
      return () => { calls.actionRemoved = true; };
    },
    onImport(handler) {
      calls.importHandler = handler;
      return () => { calls.importRemoved = true; };
    },
    readFields: () => ({}),
    renderCoverage() {},
    renderRoute() {},
    renderStops() {},
    selectStop() {},
    setEngaged(value) {
      calls.engaged = value;
    },
    setPlanLocked() {},
    setRouteMode(message) {
      calls.routeMode = message;
    },
    setStatus(message, kind) {
      calls.statuses.push([message, kind]);
    },
    showGpsWarning() {},
    showShortWarning() {},
    writeFields(values) {
      calls.writtenFields = { ...calls.writtenFields, ...values };
    },
  };
  const workflow = {
    cancel() {
      calls.cancelled = true;
    },
  };
  return { calls, view, workflow };
}

test("mountDefinitionCreator wires private runtime seams without serializing them", () => {
  const state = seams();
  const mounted = mountDefinitionCreator({
    credentials: {
      has: name => name === "mapAccess",
      read: () => "private-runtime-value",
    },
    root: {},
    stopActions: {},
    view: state.view,
    workflow: state.workflow,
  });
  assert.equal(typeof state.calls.actionHandler, "function");
  assert.equal(typeof state.calls.importHandler, "function");
  assert.equal(state.calls.engaged, false);
  assert.match(state.calls.routeMode, /Engage MazeMap/);
  assert.equal(JSON.stringify(mounted).includes("private-runtime-value"), false);
  mounted.destroy();
  assert.equal(state.calls.cancelled, true);
  assert.equal(state.calls.actionRemoved, true);
  assert.equal(state.calls.importRemoved, true);
});

test("mountDefinitionCreator names a missing app container", () => {
  assert.throws(
    () => mountDefinitionCreator({
      documentRef: { querySelector: () => null },
    }),
    /\[data-definition-creator\] container is missing/,
  );
});

test("one successful campus launch is reused instead of engaging again", async () => {
  const state = seams();
  const launches = [];
  state.view.readFields = () => ({
    campusId: "566",
    customerId: "health-nz",
    customerName: "Health New Zealand",
  });
  const mounted = mountDefinitionCreator({
    credentials: { read: () => "memory-access" },
    mapAdapter: {
      campusName: "Dunedin Hospital",
      launch: async access => {
        launches.push(access);
        return 1;
      },
    },
    root: {},
    stopActions: {},
    view: state.view,
    workflow: state.workflow,
  });
  await mounted.engage();
  await mounted.engage();
  assert.deepEqual(launches, [null]);
  assert.equal(state.calls.writtenFields.needsMapAccess, false);
});
