import assert from "node:assert/strict";
import test from "node:test";

import { createPlaybackController } from "./playback.mjs";

function controllerHarness() {
  const calls = {
    capture: [],
    intervals: [],
    maps: [],
    statuses: [],
    stopped: 0,
    cards: [],
  };
  let tick;
  const captureView = {
    showPlayback: (data, playback) =>
      calls.capture.push(["show", data, { ...playback }]),
    hidePlayback: () => calls.capture.push(["hide"]),
    setPlaybackPlaying: value => calls.capture.push(["playing", value]),
    playbackSpeed: () => 2,
    renderPlayback: (playback, event) =>
      calls.capture.push(["render", playback.t, event?.type]),
  };
  const mapAdapter = Object.fromEntries(
    ["drawRoute", "drawStops", "clearTargetMarker", "drawWaypoints",
      "drawTrails", "setActiveLeg"].map(name => [
      name,
      value => calls.maps.push([name, value]),
    ]),
  );
  const routeState = {
    legs: ["live-leg"],
    stops: ["live-stop"],
    waypoints: ["live-waypoint"],
  };
  const sessionState = { samples: ["live-sample"] };
  const controller = createPlaybackController({
    routeState,
    sessionState,
    mapAdapter,
    walkView: { updateCard: value => calls.cards.push(value) },
    captureView,
    stopPolling: () => calls.stopped++,
    setStatus: (...args) => calls.statuses.push(args),
    setIntervalImpl: (callback, delay) => {
      tick = callback;
      calls.intervals.push(["set", delay]);
      return 77;
    },
    clearIntervalImpl: timer => calls.intervals.push(["clear", timer]),
  });
  return {
    calls,
    controller,
    runTick: () => tick(),
  };
}

function playbackData() {
  return {
    legs: ["recorded-leg"],
    stops: ["recorded-stop"],
    samples: [
      { id: 1, tSentMs: 100, tRecvMs: 110 },
      { id: 2, tSentMs: 300 },
    ],
    waypoints: [{ id: 4, seq: 0, legIdx: 2 }],
    events: [
      { type: "walk_start", tMs: 200 },
      { type: "checkin", tMs: 250, wpId: 4 },
    ],
  };
}

test("controller enters, seeks, plays, pauses, and exits playback", () => {
  const { calls, controller, runTick } = controllerHarness();
  controller.enterPlayback(playbackData());
  assert.equal(controller.active, true);
  assert.equal(calls.stopped, 1);
  assert.deepEqual(calls.cards, [true]);
  assert.ok(calls.maps.some(call => call[0] === "drawRoute"));

  controller.pbSeek(500);
  const seekRender = calls.capture.filter(call => call[0] === "render").at(-1);
  assert.equal(seekRender[1], 205);
  assert.equal(seekRender[2], "walk_start");

  controller.pbTogglePlay();
  assert.deepEqual(calls.intervals[0], ["set", 100]);
  assert.deepEqual(calls.capture.at(-1), ["playing", true]);
  runTick();
  assert.ok(calls.intervals.some(call =>
    call[0] === "clear" && call[1] === 77));
  assert.ok(calls.capture.some(call =>
    call[0] === "playing" && call[1] === false));

  controller.exitPlayback();
  assert.equal(controller.active, false);
  assert.deepEqual(calls.cards, [true, undefined]);
  assert.ok(calls.maps.some(call =>
    call[0] === "drawRoute" && call[1][0] === "live-leg"));
  assert.ok(calls.maps.some(call =>
    call[0] === "drawTrails" && call[1][0] === "live-sample"));
  assert.ok(calls.capture.some(call => call[0] === "hide"));
});

test("controller rejects playback with no sample or event times", () => {
  const { calls, controller } = controllerHarness();
  controller.enterPlayback({ samples: [], events: [] });
  assert.equal(controller.active, false);
  assert.deepEqual(
    calls.statuses,
    [["err", "No samples or events in that file"]],
  );
});

test("importSession loads valid JSON and reports invalid session JSON", async () => {
  const valid = controllerHarness();
  const input = {
    files: [{ text: async () => JSON.stringify(playbackData()) }],
    value: "session.json",
  };
  valid.controller.importSession(input);
  assert.equal(input.value, "");
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(valid.controller.active, true);

  const invalid = controllerHarness();
  invalid.controller.importSession({
    files: [{ text: async () => "{}" }],
    value: "bad.json",
  });
  await Promise.resolve();
  await Promise.resolve();
  assert.match(invalid.calls.statuses[0][1], /not a route_survey session/);
});
