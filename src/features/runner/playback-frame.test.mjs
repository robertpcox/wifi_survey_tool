import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPlaybackFrame,
  playbackTimes,
} from "./playback-frame.mjs";

test("playbackTimes prefers received sample times and filters empty times", () => {
  assert.deepEqual(playbackTimes({
    samples: [
      { tSentMs: 5, tRecvMs: 10 },
      { tSentMs: 20, tRecvMs: null },
      { tSentMs: 0, tRecvMs: 0 },
    ],
    events: [{ tMs: 30 }, { tMs: 0 }],
  }), [10, 20, 30]);
  assert.deepEqual(playbackTimes({}), []);
});

function playbackData() {
  return {
    samples: [
      { id: 1, tRecvMs: 60 },
      { id: 2, tSentMs: 140 },
      { id: 3, tRecvMs: 220 },
    ],
    waypoints: [
      { id: 10, seq: 0, legIdx: 2, state: "done" },
      { id: 11, seq: 1, legIdx: 3, state: "done" },
      { id: 12, seq: 2, legIdx: 4, state: "done" },
    ],
    events: [
      { type: "walk_start", tMs: 50 },
      { type: "checkin", tMs: 100, wpId: 10 },
      { type: "skip", tMs: 150, wpId: 11 },
      { type: "checkin", tMs: 180, wpId: 999 },
    ],
  };
}

test("buildPlaybackFrame marks the first waypoint current after start", () => {
  const data = playbackData();
  const before = buildPlaybackFrame(data, 40);
  assert.equal(before.activeLeg, -1);
  assert.deepEqual(
    before.waypoints.map(waypoint => waypoint.state),
    ["pending", "pending", "pending"],
  );

  const started = buildPlaybackFrame(data, 75);
  assert.equal(started.activeLeg, 2);
  assert.deepEqual(
    started.waypoints.map(waypoint => waypoint.state),
    ["current", "pending", "pending"],
  );
  assert.deepEqual(started.samples.map(sample => sample.id), [1]);
  assert.equal(started.lastEvent.type, "walk_start");
  assert.equal(data.waypoints[0].state, "done");
});

test("buildPlaybackFrame replays check-ins, skips, and the active leg", () => {
  const frame = buildPlaybackFrame(playbackData(), 160);
  assert.equal(frame.activeLeg, 4);
  assert.deepEqual(
    frame.waypoints.map(waypoint => waypoint.state),
    ["done", "skipped", "current"],
  );
  assert.deepEqual(frame.samples.map(sample => sample.id), [1, 2]);
  assert.equal(frame.lastEvent.type, "skip");

  const later = buildPlaybackFrame(playbackData(), 200);
  assert.deepEqual(
    later.waypoints.map(waypoint => waypoint.state),
    ["done", "skipped", "current"],
  );
  assert.equal(later.lastEvent.wpId, 999);
});
