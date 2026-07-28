import assert from "node:assert/strict";
import test from "node:test";

import { createCreatorMapSession } from "./map-session.mjs";

function harness(access = "memory-only-access") {
  const calls = { fields: [], statuses: [] };
  const context = {
    building: { id: "101", name: "Clinical Services" },
    floor: { id: "501", name: "Level 00", z: 1 },
    poi: { id: "9001", name: "Room 1" },
  };
  let storedAccess = null;
  const mapAdapter = {
    campusName: "Dunedin Hospital",
    describePoint: async () => context,
    getMapZLevel: () => 1,
    launch: async (value, listener, runtime) => {
      calls.access = value;
      calls.runtime = runtime;
      calls.listener = listener;
      return 1;
    },
    startZWatch(listener) {
      calls.zListener = listener;
    },
  };
  const view = {
    clearMapSelection: () => { calls.cleared = true; },
    readFields: () => ({
      customerId: "health-nz",
      customerName: "Health New Zealand",
      campusId: "566",
    }),
    setStatus: (...args) => calls.statuses.push(args),
    showMapChoice: value => { calls.choice = value; },
    takeMapAccess: () => access,
    writeFields: value => calls.fields.push(value),
    writeMapSelection: (...args) => { calls.selection = args; },
  };
  const session = createCreatorMapSession({
    credentials: {
      read: () => storedAccess,
      set: (_name, value) => { storedAccess = value; },
    },
    mapAdapter,
    view,
  });
  return { calls, context, mapAdapter, session };
}

test("Engage keeps access in memory and launches the entered campus", async () => {
  const state = harness();
  assert.deepEqual(await state.session.engage(), {
    campusId: "566",
    campusName: "Dunedin Hospital",
    customerId: "health-nz",
    customerName: "Health New Zealand",
  });
  assert.equal(state.calls.access, "memory-only-access");
  assert.deepEqual(state.calls.runtime, { campusId: "566" });
  assert.equal(state.calls.engaged, undefined);
  assert.equal(JSON.stringify(state.session).includes("memory-only-access"), false);
});

test("map clicks resolve building and floor context before populating a stop", async () => {
  const state = harness();
  await state.session.engage();
  assert.equal(await state.session.onMapClick({
    lngLat: { lng: 170.5, lat: -45.87 },
  }), state.context);
  assert.deepEqual(state.calls.selection, [{
    locationType: "room",
    poiId: "9001",
    stopLat: -45.87,
    stopLng: 170.5,
    stopName: "Room 1",
    stopZ: 1,
  }, state.context]);
  assert.deepEqual(state.calls.choice, {
    clicked: { lat: -45.87, lng: 170.5, z: 1 },
    context: state.context,
  });
});

test("map clicks without a POI stage their exact coordinates", async () => {
  const state = harness();
  state.mapAdapter.describePoint = async () => {
    throw new Error("No POI found");
  };
  const context = await state.session.onMapClick({
    lngLat: { lng: 170.5, lat: -45.87 },
  });
  assert.deepEqual(context, {
    coordinateOnly: true,
    building: { id: null, name: null },
    floor: { id: null, name: "z1", z: 1 },
    poi: { center: null, id: null, name: null },
  });
  assert.deepEqual(state.calls.selection, [{
    locationType: "room",
    poiId: "",
    stopLat: -45.87,
    stopLng: 170.5,
    stopName: "-45.870000, 170.500000",
    stopZ: 1,
  }, context]);
  assert.deepEqual(state.calls.choice, {
    clicked: { lat: -45.87, lng: 170.5, z: 1 },
    context,
  });
  assert.equal(state.calls.statuses.at(-1)[1], "ok");
  assert.match(state.calls.statuses.at(-1)[0], /Clicked coordinates are ready/);
});

test("session plainly reports missing SDK, access, or click metadata", async () => {
  const view = {
    readFields: () => ({
      customerId: "a",
      customerName: "A",
      campusId: "566",
    }),
    setStatus() {},
    takeMapAccess: () => "",
  };
  await assert.rejects(
    createCreatorMapSession({ view }).engage(),
    /SDK loader is unavailable/,
  );
  await assert.rejects(
    createCreatorMapSession({
      credentials: { read: () => null },
      mapAdapter: { launch() {} },
      view,
    }).engage(),
    /access token/,
  );
  const state = harness();
  state.session.onMapClick({ lngLat: { lng: "bad", lat: 1 } });
  assert.match(state.calls.statuses.at(-1)[0], /longitude, latitude, or z-level/);
});
