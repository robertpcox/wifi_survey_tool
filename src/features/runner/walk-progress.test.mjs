import assert from "node:assert/strict";
import test from "node:test";

import { createWalkProgress } from "./walk-progress.mjs";

function waypoint(id, kind, legIdx) {
  return {
    id,
    kind,
    lat: -36.85,
    legIdx,
    lng: 174.76 + id * 0.001,
    name: `Point ${id}`,
    seq: id,
    state: "pending",
    z: 1,
  };
}

test("createWalkProgress preserves check-in, dwell, skip, undo, and finish", () => {
  const routeState = {
    waypoints: [
      waypoint(0, "stop", 0),
      waypoint(1, "mid", 0),
      waypoint(2, "stop", 1),
      waypoint(3, "stop", 2),
    ],
  };
  const sessionState = {
    events: [],
    meta: { endedAt: null },
    walk: { history: [], phase: "walking", wpIdx: 0 },
  };
  const calls = {
    cards: 0,
    counts: [],
    draws: 0,
    focuses: [],
    logs: 0,
    statuses: [],
    vibrations: [],
  };
  const logEvent = (type, detail) => {
    sessionState.events.push({ type, ...detail });
  };
  const progress = createWalkProgress({
    captureView: {
      renderLog: () => calls.logs++,
    },
    logEvent,
    mapAdapter: {
      drawWaypoints: () => calls.draws++,
      focusWaypoint: item => calls.focuses.push(item.id),
    },
    nowDate: () => new Date("2026-07-28T00:00:00.000Z"),
    routeState,
    sessionState,
    setStatus: (...value) => calls.statuses.push(value),
    vibrate: value => calls.vibrations.push(value),
    walkView: {
      setCheckinCount: value => calls.counts.push(value),
      updateCard: () => calls.cards++,
    },
  });
  progress.setCurrentWaypoint(0);
  assert.equal(routeState.waypoints[0].state, "current");
  progress.checkin();
  assert.equal(sessionState.walk.wpIdx, 1);
  assert.equal(routeState.waypoints[0].state, "done");
  assert.equal(routeState.waypoints[1].state, "current");
  progress.checkin();
  assert.equal(sessionState.walk.wpIdx, 2);
  progress.checkin();
  assert.equal(sessionState.walk.phase, "awaitDepart");
  assert.deepEqual(
    sessionState.events.slice(-2).map(event => event.type),
    ["checkin", "arrive"],
  );
  progress.depart();
  assert.equal(sessionState.walk.phase, "walking");
  assert.equal(sessionState.walk.wpIdx, 3);
  assert.equal(sessionState.events.at(-1).type, "depart");
  progress.undoCheckin();
  assert.equal(sessionState.walk.phase, "awaitDepart");
  assert.equal(sessionState.walk.wpIdx, 2);
  assert.equal(routeState.waypoints[2].state, "current");
  assert.notEqual(sessionState.events.at(-1).type, "depart");
  progress.skipWaypoint();
  assert.equal(routeState.waypoints[2].state, "skipped");
  assert.equal(sessionState.walk.wpIdx, 3);
  progress.undoCheckin();
  assert.equal(sessionState.walk.phase, "awaitDepart");
  assert.equal(sessionState.walk.wpIdx, 2);
  assert.notEqual(sessionState.events.at(-1).type, "skip");
  progress.depart();
  progress.checkin();
  assert.equal(sessionState.walk.phase, "done");
  assert.equal(sessionState.meta.endedAt, "2026-07-28T00:00:00.000Z");
  assert.deepEqual(
    sessionState.events.slice(-3).map(event => event.type),
    ["checkin", "arrive", "walk_end"],
  );
  assert.deepEqual(calls.statuses.at(-1), [
    "ok",
    "Walk complete — export the session or play it back",
  ]);
  progress.undoCheckin();
  assert.equal(sessionState.walk.phase, "walking");
  assert.equal(sessionState.walk.wpIdx, 3);
  assert.equal(routeState.waypoints[3].state, "current");
  assert.equal(calls.counts.at(-1), 3);
  progress.skipWaypoint();
  assert.equal(sessionState.walk.phase, "done");
  assert.equal(routeState.waypoints[3].state, "skipped");
  progress.finishWalk({ note: "manual proof" });
  assert.deepEqual(sessionState.events.at(-1), {
    note: "manual proof",
    type: "walk_end",
  });
  progress.setCurrentWaypoint(99);
  assert.ok(routeState.waypoints.every(item => item.state !== "current"));
  assert.deepEqual(calls.vibrations, [100, 100, 100, 100]);
  assert.ok(calls.draws > 0);
  assert.ok(calls.cards > 0);
  assert.ok(calls.logs > 0);
});
