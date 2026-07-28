import assert from "node:assert/strict";
import test from "node:test";

import {
  appendWalkEvent,
  checkinEvent,
  removeLatestWalkAction,
} from "./walk-events.mjs";

test("walk event helpers preserve timestamps, checkpoint shape, and undo scope", () => {
  const sessionState = { events: [] };
  appendWalkEvent(
    sessionState,
    "walk_start",
    { note: "3 points, 2 legs" },
    () => 1_753_660_800_000,
  );
  assert.deepEqual(sessionState.events, [{
    iso: "2025-07-28T00:00:00.000Z",
    note: "3 points, 2 legs",
    tMs: 1_753_660_800_000,
    type: "walk_start",
  }]);
  const waypoint = {
    extra: "not exported",
    id: 7,
    kind: "turn",
    lat: -36.85,
    legIdx: 2,
    lng: 174.76,
    name: "Turn point",
    seq: 4,
    z: 3,
  };
  assert.deepEqual(checkinEvent(waypoint), {
    lat: -36.85,
    legIdx: 2,
    lng: 174.76,
    wpId: 7,
    wpKind: "turn",
    wpName: "Turn point",
    wpSeq: 4,
    z: 3,
  });
  const events = [
    { type: "walk_start" },
    { type: "checkin" },
    { type: "arrive" },
    { type: "walk_end" },
  ];
  removeLatestWalkAction(events);
  assert.deepEqual(events, [{ type: "walk_start" }]);
  events.push({ type: "depart" }, { type: "info" }, { type: "skip" });
  removeLatestWalkAction(events);
  assert.deepEqual(events, [
    { type: "walk_start" },
    { type: "depart" },
    { type: "info" },
  ]);
  removeLatestWalkAction(events);
  assert.deepEqual(events, [{ type: "walk_start" }]);
  removeLatestWalkAction(events);
  assert.deepEqual(events, []);
});
