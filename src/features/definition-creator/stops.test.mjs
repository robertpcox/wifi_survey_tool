import assert from "node:assert/strict";
import test from "node:test";

import {
  adjustStop,
  createExactStop,
  createGpsStop,
  createPoiStop,
  gpsAccuracyWarning,
} from "./stops.mjs";

test("exact points and POI centres retain placement context", () => {
  const exact = createExactStop({
    id: "stop-1",
    name: "Door",
    lng: 170.5,
    lat: -45.87,
    z: 1,
    locationType: "room",
  });
  assert.deepEqual(exact.provenance, { method: "map" });
  assert.equal(exact.poiId, null);

  const poi = createPoiStop({
    id: "stop-2",
    poi: {
      properties: { poiId: 42, title: "Reception", zLevel: 2 },
      geometry: { type: "Point", coordinates: [170.51, -45.88] },
    },
  });
  assert.deepEqual(
    {
      name: poi.name,
      poiId: poi.poiId,
      lng: poi.lng,
      lat: poi.lat,
      z: poi.z,
      method: poi.provenance.method,
    },
    {
      name: "Reception",
      poiId: "42",
      lng: 170.51,
      lat: -45.88,
      z: 2,
      method: "poi",
    },
  );
});

test("GPS capture exports evidence and adjustment preserves its provenance", () => {
  const stop = createGpsStop({
    id: "stop-3",
    name: "Courtyard",
    z: 0,
    locationType: "room",
    capture: {
      lng: 170.52,
      lat: -45.89,
      accuracyM: 35,
      capturedAt: "2026-07-28T01:02:03.000Z",
    },
  });
  assert.deepEqual(stop.provenance, {
    method: "gps",
    accuracyM: 35,
    capturedAt: "2026-07-28T01:02:03.000Z",
    capturedPosition: { lng: 170.52, lat: -45.89 },
    adjusted: false,
  });
  assert.equal(stop.locationType, "room");
  assert.match(
    gpsAccuracyWarning(stop, 20),
    /Courtyard.*indoor GPS can be unreliable.*35\.0 m.*20\.0 m/,
  );

  const adjusted = adjustStop(stop, {
    name: "Courtyard adjusted",
    lng: 170.521,
    lat: -45.891,
    z: 0,
    locationType: "outdoors",
  });
  assert.equal(adjusted.provenance.adjusted, true);
  assert.deepEqual(
    adjusted.provenance.capturedPosition,
    { lng: 170.52, lat: -45.89 },
  );
  assert.equal(adjusted.lng, 170.521);
});

test("GPS and POI errors identify the failing input", () => {
  assert.throws(
    () => createGpsStop({
      id: "stop-1",
      name: "Bad",
      z: "",
      capture: { lng: 1, lat: 2, accuracyM: 3, capturedAt: "bad" },
    }),
    /GPS timestamp/,
  );
  assert.throws(
    () => createPoiStop({ id: "stop-1", poi: { id: 1 }, z: 0 }),
    /poiId: selected POI has no usable centre/,
  );
});

test("outdoor GPS with acceptable accuracy needs no warning", () => {
  const stop = createGpsStop({
    id: "stop-1",
    name: "Outside",
    z: 0,
    locationType: "outdoors",
    capture: {
      lng: 1,
      lat: 2,
      accuracyM: 5,
      capturedAt: "2026-07-28T01:02:03.000Z",
    },
  });
  assert.equal(gpsAccuracyWarning(stop, 20), null);
});
