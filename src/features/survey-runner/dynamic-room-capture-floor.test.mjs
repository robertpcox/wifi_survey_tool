// FEATURE:      Dynamic room live-floor capture
// SURFACE:      Map click through committed dynamic checkpoint
// WHY TOGETHER: The native floor control and clicked ground truth must share one z-level.
// STATE:        Adapter with deliberately stale cached floor
// RULES:        Live map z-level wins over the adapter cache and positioning evidence.
// PROVENANCE:   Step 4 Runner dynamic-room review

import assert from "node:assert/strict";
import test from "node:test";

import { createDynamicRoomSession }
  from "../../domain/dynamic-room-session-v3.mjs";
import { createDynamicRoomCapture } from "./dynamic-room-capture.mjs";

test("capture reads the native map floor at click time", async () => {
  const session = createDynamicRoomSession();
  const routed = [];
  const mapAdapter = {
    currentZLevel: 1,
    getMapZLevel: () => 9,
    describePoint: async (lng, lat, z) => ({
      building: { id: "b", name: "Building" },
      floor: { id: "f", name: "Level 09", z },
      poi: { id: null, name: null, center: null },
    }),
    drawStops() {},
    drawWaypoints() {},
    focusWaypoint() {},
    setMapZLevel() {},
  };
  const capture = createDynamicRoomCapture({
    session,
    state: { pointBusy: false, error: null },
    routeAuthor: { commitStop: stop => routed.push(stop), reviseStops() {} },
    mapAdapter,
    pollLoop: { active: true },
    view: { acceptsMapPoint: () => true, render() {} },
    nowIso: () => "2026-07-30T01:00:00.000Z",
    nowMs: () => 0,
    setTimer: () => 1,
    clearTimer() {},
  });
  await capture.handleMapClick({
    lngLat: { lng: 170.5085, lat: -45.8724 },
    normalized: { lng: 1, lat: 2, z: 3 },
  });
  assert.equal(capture.checkIn(), true);
  assert.equal(session.stops[0].z, 9);
  assert.equal(routed[0].z, 9);
});

test("dispose ignores a point description that resolves after Clear", async () => {
  let resolveDescription;
  let renders = 0;
  const session = createDynamicRoomSession();
  const capture = createDynamicRoomCapture({
    session,
    state: { pointBusy: false, error: null },
    routeAuthor: { commitStop() {}, reviseStops() {} },
    mapAdapter: {
      currentZLevel: 1,
      describePoint: () => new Promise(resolve => { resolveDescription = resolve; }),
      drawStops() {},
      drawWaypoints() {},
    },
    pollLoop: { active: true },
    view: { acceptsMapPoint: () => true, render: () => { renders++; } },
    nowIso: () => "2026-07-30T01:00:00.000Z",
    nowMs: () => 0,
    setTimer: () => 1,
    clearTimer() {},
  });
  const pending = capture.handleMapClick({
    lngLat: { lng: 170.5085, lat: -45.8724 },
  });
  const beforeClear = renders;
  assert.equal(capture.dispose(), true);
  resolveDescription(null);
  assert.equal(await pending, false);
  assert.equal(renders, beforeClear);
  assert.equal(session.pendingPoint, null);
});
