import assert from "node:assert/strict";
import test from "node:test";

import { createWalkController } from "./walk.mjs";

function waypoint(id, kind, legIdx) {
  return {
    id,
    kind,
    lat: -36.85,
    legIdx,
    lng: 174.76 + id * 0.001,
    name: `Waypoint ${id}`,
    seq: id,
    state: "old",
    stopIdx: id,
    z: 1,
  };
}

test("createWalkController preserves start, restart, manual end, reset, and blocking", () => {
  const routeState = { legs: [{}, {}], waypoints: [] };
  const sessionState = {
    events: [],
    meta: { endedAt: null, routeName: "", startedAt: null },
    pollRun: { cloud: false, lipi: false },
    walk: { history: [], phase: "idle", wpIdx: -1 },
  };
  let playbackActive = false;
  const calls = {
    cards: 0,
    counts: [],
    focuses: [],
    logs: 0,
    polls: 0,
    statuses: [],
  };
  const controller = createWalkController({
    captureView: { renderLog: () => calls.logs++ },
    getRouteName: () => "Level walk",
    isPlaybackActive: () => playbackActive,
    mapAdapter: {
      drawWaypoints() {},
      focusWaypoint: item => calls.focuses.push(item.id),
    },
    nowDate: () => new Date("2026-07-28T00:00:00.000Z"),
    nowMs: () => 1_775_000_000_000,
    routeState,
    sessionState,
    setStatus: (...value) => calls.statuses.push(value),
    startPolling: () => {
      calls.polls++;
      sessionState.pollRun.cloud = true;
    },
    vibrate() {},
    walkView: {
      setCheckinCount: value => calls.counts.push(value),
      updateCard: () => calls.cards++,
    },
  });
  controller.endWalk();
  assert.equal(sessionState.events.length, 0);
  controller.walkMainAction();
  assert.deepEqual(calls.statuses.at(-1), ["err", "Build the route first"]);
  routeState.waypoints = [
    waypoint(0, "stop", 0),
    waypoint(1, "stop", 0),
    waypoint(2, "stop", 1),
  ];
  controller.walkMainAction();
  assert.equal(sessionState.walk.phase, "walking");
  assert.equal(sessionState.walk.wpIdx, 0);
  assert.equal(sessionState.meta.startedAt, "2026-07-28T00:00:00.000Z");
  assert.equal(sessionState.meta.routeName, "Level walk");
  assert.equal(sessionState.events.at(-1).type, "walk_start");
  assert.equal(sessionState.events.at(-1).note, "3 points, 2 legs");
  assert.equal(routeState.waypoints[0].state, "current");
  assert.equal(calls.polls, 1);
  assert.equal(controller.isRouteEditingBlocked(), true);
  controller.walkMainAction();
  assert.equal(sessionState.walk.wpIdx, 1);
  controller.walkMainAction();
  assert.equal(sessionState.walk.phase, "awaitDepart");
  assert.equal(sessionState.events.at(-1).type, "arrive");
  controller.undoCheckin();
  assert.equal(sessionState.walk.phase, "walking");
  assert.equal(sessionState.walk.wpIdx, 1);
  controller.walkMainAction();
  controller.walkMainAction();
  assert.equal(sessionState.walk.wpIdx, 2);
  controller.skipWaypoint();
  assert.equal(sessionState.walk.phase, "done");
  assert.equal(routeState.waypoints[2].state, "skipped");
  assert.equal(sessionState.events.at(-1).type, "walk_end");
  assert.equal(controller.isRouteEditingBlocked(), false);
  const startedAt = sessionState.meta.startedAt;
  controller.walkMainAction();
  assert.equal(sessionState.walk.phase, "walking");
  assert.equal(sessionState.walk.wpIdx, 0);
  assert.equal(sessionState.meta.startedAt, startedAt);
  assert.ok(routeState.waypoints.slice(1).every(item => item.state === "pending"));
  assert.equal(calls.polls, 1);
  controller.endWalk();
  assert.equal(sessionState.walk.phase, "done");
  assert.equal(sessionState.events.at(-1).note, "ended manually");
  assert.ok(calls.logs > 0);
  controller.reset("walking", 2);
  assert.deepEqual(sessionState.walk, {
    history: [],
    phase: "walking",
    wpIdx: 2,
  });
  assert.equal(controller.isRouteEditingBlocked(), true);
  controller.reset();
  assert.deepEqual(sessionState.walk, {
    history: [],
    phase: "idle",
    wpIdx: -1,
  });
  playbackActive = true;
  const eventCount = sessionState.events.length;
  controller.walkMainAction();
  assert.equal(sessionState.events.length, eventCount);
  assert.equal(controller.isRouteEditingBlocked(), true);
});
