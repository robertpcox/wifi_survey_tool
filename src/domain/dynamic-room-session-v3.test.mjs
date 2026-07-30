// FEATURE:      Dynamic room survey capture
// SURFACE:      Dynamic session state and permanent check-in identity tests
// WHY TOGETHER: Point selection, authoring records, and captured truth are one action.
// STATE:        Deterministic mutable test sessions
// RULES:        Instant and dwelling check-ins retain exact clicked map coordinates.
// PROVENANCE:   Step 4 Runner dynamic-room extension

import assert from "node:assert/strict";
import test from "node:test";

import {
  checkInDynamicRoomPoint,
  createDynamicRoomSession,
  placeDynamicRoomPoint,
  refreshDynamicRoomDwell,
} from "./dynamic-room-session-v3.mjs";
import { authoredCheckpointsV3 } from "./checkpoint-dwell-v3.mjs";
import {
  createRouteLegV3,
  generateRouteCheckpointsV3,
} from "./creator-route-v3.mjs";

const AT_ONE = "2026-07-30T01:00:00.000Z";
const AT_TWO = "2026-07-30T01:00:20.000Z";
const ROOM_ONE = { lng: 170.5085, lat: -45.8724, z: 1, name: "Room one" };
const ROOM_TWO = { lng: 170.5087, lat: -45.8726, z: 1 };

test("session moves from map selection to an exact instant check-in", () => {
  const session = createDynamicRoomSession();
  assert.equal(session.phase, "awaiting-point");
  placeDynamicRoomPoint(session, ROOM_ONE);
  assert.equal(session.phase, "pending-point");
  const result = checkInDynamicRoomPoint(session, { at: AT_ONE });
  assert.equal(session.phase, "walking");
  assert.equal(result.legRequest, null);
  assert.deepEqual(session.stops[0], {
    id: "stop-1",
    name: "Room one",
    lng: ROOM_ONE.lng,
    lat: ROOM_ONE.lat,
    z: ROOM_ONE.z,
    poiId: null,
    poiName: null,
    locationType: "room",
    provenance: { method: "map" },
  });
  assert.deepEqual(session.checkpoints[0], {
    id: "checkpoint-1",
    sequence: 0,
    type: "stop",
    lng: ROOM_ONE.lng,
    lat: ROOM_ONE.lat,
    z: ROOM_ONE.z,
    stopId: "stop-1",
    legId: null,
    spacingBasisM: 0,
    dwellSeconds: 0,
  });
  assert.deepEqual(session.checkIns[0], {
    checkpointId: "checkpoint-1",
    at: AT_ONE,
    groundTruth: { lng: ROOM_ONE.lng, lat: ROOM_ONE.lat, z: ROOM_ONE.z },
  });
  assert.deepEqual(session.events[0], {
    type: "checkpoint-reached",
    checkpointId: "checkpoint-1",
    at: AT_ONE,
  });
});

test("the next check-in exposes an ordered background leg request", () => {
  const session = createDynamicRoomSession();
  placeDynamicRoomPoint(session, ROOM_ONE);
  checkInDynamicRoomPoint(session, { at: AT_ONE });
  placeDynamicRoomPoint(session, ROOM_TWO);
  const result = checkInDynamicRoomPoint(session, { at: AT_TWO });
  assert.deepEqual(result.legRequest, {
    index: 0,
    fromStopId: "stop-1",
    toStopId: "stop-2",
  });
  assert.deepEqual(
    session.checkpoints.map(checkpoint => checkpoint.id),
    ["checkpoint-1", "checkpoint-2"],
  );
  assert.equal(session.routeRevision, 2);
});

test("captured stops and checkpoints are standard V3 authoring inputs", () => {
  const session = createDynamicRoomSession();
  placeDynamicRoomPoint(session, ROOM_ONE);
  checkInDynamicRoomPoint(session, { at: AT_ONE });
  placeDynamicRoomPoint(session, ROOM_TWO);
  checkInDynamicRoomPoint(session, { at: AT_TWO });
  const leg = createRouteLegV3(
    session.stops[0],
    session.stops[1],
    session.stops,
    0,
  );
  const generated = generateRouteCheckpointsV3(
    session.stops,
    [leg],
    0,
  ).checkpoints;
  assert.deepEqual(
    authoredCheckpointsV3(generated, session.checkpoints),
    session.checkpoints,
  );
});

test("dwell expiry returns capture to walking", () => {
  const session = createDynamicRoomSession();
  placeDynamicRoomPoint(session, ROOM_ONE);
  checkInDynamicRoomPoint(session, { at: AT_ONE, dwell: true, nowMs: 100 });
  assert.equal(session.phase, "dwelling");
  assert.equal(session.checkpoints[0].dwellSeconds, 5);
  assert.deepEqual(refreshDynamicRoomDwell(session, 4_101), {
    changed: false,
    remainingSeconds: 1,
  });
  assert.deepEqual(refreshDynamicRoomDwell(session, 5_100), {
    changed: true,
    remainingSeconds: 0,
  });
  assert.equal(session.phase, "walking");
});

test("invalid points and dwell clocks are rejected before mutation", () => {
  const session = createDynamicRoomSession();
  assert.throws(
    () => placeDynamicRoomPoint(session, { lng: 1, lat: 2 }),
    /lng, lat, and z/,
  );
  placeDynamicRoomPoint(session, ROOM_ONE);
  assert.throws(
    () => checkInDynamicRoomPoint(
      session,
      { at: AT_ONE, dwell: true, nowMs: Number.NaN },
    ),
    /monotonic/,
  );
  assert.equal(session.stops.length, 0);
  assert.equal(session.phase, "pending-point");
});
