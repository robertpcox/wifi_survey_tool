// FEATURE:      Dynamic room map-point capture
// SURFACE:      Exact click and MazeMap enrichment tests
// WHY TOGETHER: Provider context must never displace operator-selected ground truth.
// STATE:        Fake map clicks and point descriptions
// RULES:        Poll fixes, POI centres, and described floors cannot replace click truth.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import assert from "node:assert/strict";
import test from "node:test";

import { dynamicRoomPointFromMapClick }
  from "./dynamic-room-point.mjs";

const CLICK = { lngLat: { lng: 170.5085, lat: -45.8724 } };

test("click coordinates and current map floor create an exact point", async () => {
  const point = await dynamicRoomPointFromMapClick({
    ...CLICK,
    normalized: { lng: 1, lat: 2, z: 8 },
  }, {
    currentZLevel: () => 1,
    currentPosition: () => ({ lng: 3, lat: 4, z: 9 }),
  });
  assert.deepEqual(point, {
    lng: 170.5085,
    lat: -45.8724,
    z: 1,
    name: "-45.872400, 170.508500",
    _mapContext: {
      coordinateOnly: true,
      building: { id: null, name: null },
      floor: { id: null, name: "z1", z: 1 },
      poi: { id: null, name: null, center: null },
    },
  });
});

test("MazeMap descriptions enrich labels and coverage, not truth", async () => {
  const calls = [];
  const point = await dynamicRoomPointFromMapClick({
    ...CLICK,
    zLevel: 8,
  }, {
    currentZLevel: 1,
    describePoint: async (...args) => {
      calls.push(args);
      return {
        building: { id: 51, name: "Outpatient Building" },
        floor: { id: 99, z: 8, name: "OB Level 00" },
        poi: {
          id: 700,
          name: "Consult Room",
          center: { lng: 10, lat: 20, z: 8 },
        },
      };
    },
  });
  assert.deepEqual(calls, [[170.5085, -45.8724, 1]]);
  assert.deepEqual(
    { lng: point.lng, lat: point.lat, z: point.z, name: point.name },
    {
      lng: 170.5085,
      lat: -45.8724,
      z: 1,
      name: "Consult Room",
    },
  );
  assert.deepEqual(point._mapContext, {
    building: { id: "51", name: "Outpatient Building" },
    floor: { id: "99", name: "OB Level 00", z: 1 },
    poi: {
      id: "700",
      name: "Consult Room",
      center: { lng: 10, lat: 20, z: 8 },
    },
  });
});

test("empty descriptions retain exact coordinate naming", async () => {
  const point = await dynamicRoomPointFromMapClick(CLICK, {
    currentZLevel: 0,
    describePoint: async () => null,
  });
  assert.equal(point.name, "-45.872400, 170.508500");
  assert.equal(point.z, 0);
  assert.equal(point._mapContext.floor.z, 0);
});

test("failed optional descriptions fall back to exact click truth", async () => {
  const point = await dynamicRoomPointFromMapClick(CLICK, {
    currentZLevel: 2,
    describePoint: async () => {
      throw new Error("No building metadata was found at this point");
    },
  });
  assert.deepEqual(
    { lng: point.lng, lat: point.lat, z: point.z },
    { lng: 170.5085, lat: -45.8724, z: 2 },
  );
  assert.equal(point._mapContext.coordinateOnly, true);
});

test("invalid clicks and missing map floor reject clearly", async () => {
  await assert.rejects(
    dynamicRoomPointFromMapClick(
      { lngLat: { lng: "bad", lat: -45.8 } },
      { currentZLevel: 1 },
    ),
    /lngLat.*current z-level/,
  );
  await assert.rejects(
    dynamicRoomPointFromMapClick(CLICK),
    /current z-level/,
  );
});
