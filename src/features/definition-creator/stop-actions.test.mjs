import assert from "node:assert/strict";
import test from "node:test";
import { createStopActions } from "./stop-actions.mjs";

const exactFields = {
  _mapContext: {
    building: { id: "101", name: "Building A" },
    floor: { id: "501", name: "Level 00", z: 1 },
  },
  stopName: "Door",
  stopLng: "170.5",
  stopLat: "-45.87",
  stopZ: "1",
  locationType: "room",
};

test("stop actions create exact and looked-up POI stops", async () => {
  let lookups = 0;
  const actions = createStopActions({
    lookupPoi: async id => {
      lookups += 1;
      return { id, name: "Reception", lng: 170.51, lat: -45.88, z: 2 };
    },
  });
  const _mapContext = {
    ...exactFields._mapContext,
    poi: {
      center: { lng: 170.51, lat: -45.88, z: 1 },
      id: "42",
      name: "Reception",
    },
  };
  const exact = actions.exact({ ...exactFields, _mapContext }, "stop-1");
  const poi = await actions.poi({ _mapContext, poiId: "42" }, "stop-2");
  assert.deepEqual(
    { method: exact.provenance.method, poiId: exact.poiId, poiName: exact.poiName },
    { method: "map", poiId: "42", poiName: "Reception" },
  );
  assert.deepEqual(
    { lng: poi.lng, lat: poi.lat, z: poi.z },
    _mapContext.poi.center,
  );
  assert.equal(lookups, 0);
  await actions.poi({ poiId: "43" }, "stop-3");
  assert.equal(lookups, 1);
});

test("GPS action uses explicit z and returns a named nonblocking warning", async () => {
  const actions = createStopActions({
    accuracyThresholdM: 20,
    capturePosition: async () => ({
      lng: 170.5,
      lat: -45.87,
      accuracyM: 30,
      capturedAt: "2026-07-28T00:00:00.000Z",
    }),
  });
  const result = await actions.gps(
    { gpsName: "Courtyard", gpsZ: "0", locationType: "outdoors" },
    "stop-1",
  );
  assert.equal(result.stop.z, 0);
  assert.equal(result.stop.locationType, "outdoors");
  assert.match(result.warning, /Courtyard.*30\.0 m/);
});

test("GPS action retains an indoor location and warns even with good accuracy", async () => {
  const actions = createStopActions({
    capturePosition: async () => ({
      lng: 170.5,
      lat: -45.87,
      accuracyM: 3,
      capturedAt: "2026-07-28T00:00:00.000Z",
    }),
  });
  const result = await actions.gps({
    gpsName: "Atrium",
    gpsZ: "1",
    locationType: "room",
  }, "stop-1");
  assert.equal(result.stop.locationType, "room");
  assert.match(result.warning, /Atrium.*indoor GPS can be unreliable/);
  assert.doesNotMatch(result.warning, /accuracy/);
});

test("blank exact and GPS numeric fields are rejected", async () => {
  const actions = createStopActions({
    capturePosition: async () => {
      throw new Error("capture must not run");
    },
  });
  for (const field of ["stopLng", "stopLat", "stopZ"]) {
    assert.throws(
      () => actions.exact({ ...exactFields, [field]: "  " }, "stop-1"),
      new RegExp(`${field}: is required`),
    );
  }
  await assert.rejects(
    actions.gps({
      gpsName: "Atrium",
      gpsZ: "",
      locationType: "room",
    }, "stop-1"),
    /gpsZ: is required/,
  );
});

test("adjust requires selection and retains GPS provenance", async () => {
  const actions = createStopActions({
    capturePosition: async () => ({
      lng: 1,
      lat: 2,
      accuracyM: 3,
      capturedAt: "2026-07-28T00:00:00.000Z",
    }),
  });
  const { stop } = await actions.gps({
    gpsName: "GPS",
    gpsZ: 0,
    locationType: "outdoors",
  }, "stop-1");
  const adjusted = actions.adjust({
    ...exactFields,
    stopName: "GPS adjusted",
  }, stop);
  assert.equal(adjusted.provenance.method, "gps");
  assert.equal(adjusted.provenance.adjusted, true);
  assert.throws(() => actions.adjust(exactFields, null), /Select a stop/);
});

test("denied or unavailable capture rejects before a stop can be returned", async () => {
  for (const message of [
    "Geolocation permission was denied.",
    "Geolocation is unavailable.",
  ]) {
    const actions = createStopActions({
      capturePosition: async () => {
        throw new Error(message);
      },
    });
    await assert.rejects(
      actions.gps({
        gpsName: "Outside",
        gpsZ: 0,
        locationType: "outdoors",
      }, "stop-1"),
      new RegExp(message.replaceAll(".", "\\.")),
    );
  }
});
