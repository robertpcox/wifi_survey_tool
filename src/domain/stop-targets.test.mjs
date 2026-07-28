import assert from "node:assert/strict";
import test from "node:test";

import {
  outdoorsStop,
  pointToStop,
  poiToStop,
  stopName,
  stopTargetTitle,
  tagOf,
} from "./stop-targets.mjs";

test("poiToStop reads the preferred point and POI properties", () => {
  const stop = poiToStop({
    properties: { poiId: 42, title: "Lecture Theatre", zLevel: 3 },
    point: { coordinates: [170.5, -45.8] },
  });
  assert.deepEqual(stop, {
    label: "Lecture Theatre",
    poiId: 42,
    poiName: "Lecture Theatre",
    locationType: "poi",
    lng: 170.5,
    lat: -45.8,
    z: 3,
    targetType: "poi",
    poi: {
      id: 42,
      label: "Lecture Theatre",
      lng: 170.5,
      lat: -45.8,
      z: 3,
    },
  });
});

test("poiToStop supports point and polygon geometry", () => {
  const point = poiToStop({
    properties: { poiId: 5, z: 2 },
    geometry: { type: "Point", coordinates: [4, 6] },
  });
  assert.deepEqual(
    { label: point.label, lng: point.lng, lat: point.lat, z: point.z },
    { label: "POI 5", lng: 4, lat: 6, z: 2 },
  );

  const polygon = poiToStop({
    properties: { title: "Area" },
    geometry: {
      type: "Polygon",
      coordinates: [[[0, 0], [6, 0], [3, 6]]],
    },
  });
  assert.deepEqual(
    { lng: polygon.lng, lat: polygon.lat, z: polygon.z },
    { lng: 3, lat: 2, z: 1 },
  );
  assert.equal(poiToStop({ geometry: { type: "LineString" } }), null);
});

test("pointToStop retains optional POI context without changing its target", () => {
  const plain = pointToStop(1, 2, 3);
  assert.deepEqual(plain, {
    label: "2.000000, 1.000000 (z3)",
    poiId: null,
    poiName: null,
    locationType: "unknown",
    lng: 1,
    lat: 2,
    z: 3,
    targetType: "point",
    poi: null,
  });

  const poi = { id: 8, label: "Room 8", lng: 9, lat: 10, z: 3 };
  const contextual = pointToStop(1, 2, 3, { poi });
  assert.equal(contextual.label, "Room 8");
  assert.equal(contextual.poiId, 8);
  assert.equal(contextual.locationType, "poi");
  assert.notEqual(contextual.poi, poi);
});

test("outdoorsStop removes POI context and labels the coordinates", () => {
  const outdoors = outdoorsStop(pointToStop(170.5, -45.8, 1, {
    poi: { id: 8, label: "Nearby room" },
  }));
  assert.equal(outdoors.label, "Outdoors — -45.800000, 170.500000");
  assert.equal(outdoors.poiId, null);
  assert.equal(outdoors.poiName, "Outdoors");
  assert.equal(outdoors.locationType, "outdoors");
  assert.equal(outdoors.poi, null);
});

test("tagOf and stopName use an explicit tag or generated fallback", () => {
  const stops = [
    { tag: "Start", label: "Lobby" },
    { label: "Lab" },
  ];
  assert.equal(tagOf(stops, 0), "Start");
  assert.equal(tagOf(stops, 1), "B");
  assert.equal(stopName(stops, 1), "B — Lab");
});

test("stopTargetTitle distinguishes POI-centre and exact-point targets", () => {
  assert.equal(
    stopTargetTitle({
      targetType: "poi",
      lat: -45.8,
      lng: 170.5,
      z: 2,
    }),
    "POI centre target: -45.800000, 170.500000, z2",
  );
  assert.equal(
    stopTargetTitle({
      targetType: "point",
      poiName: "Lobby",
      lat: -45.8,
      lng: 170.5,
      z: 2,
    }),
    "Exact point in Lobby: -45.800000, 170.500000, z2",
  );
});
