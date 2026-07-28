// FEATURE:      Full-screen Report Player clock
// SURFACE:      node --test src/features/report-player/playback-controller.test.mjs
// WHY TOGETHER: Active emission, transport stepping, pause, follow, and clamping form one state machine.
// STATE:        Injected timer callback, clear calls, and emitted deterministic frames
// RULES:        Inactive Player operations preserve time but cause no hidden onFrame writes.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createPlaybackController } from "./playback-controller.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("inactive playback pauses, preserves time, and suppresses hidden frame writes", () => {
  const frames = [];
  const cleared = [];
  let tick;
  const controller = createPlaybackController({
    result,
    onFrame: frame => frames.push(frame),
    setIntervalRef: callback => { tick = callback; return 17; },
    clearIntervalRef: timer => cleared.push(timer),
    tickMs: 1000,
  });
  assert.equal(frames.length, 1);
  controller.setSpeed(2);
  controller.play();
  tick();
  assert.equal(controller.atMs, controller.bounds.startMs + 2000);
  controller.setActive(false);
  assert.equal(controller.playing, false);
  assert.deepEqual(cleared, [17]);
  const visibleWrites = frames.length;
  controller.nextEvent();
  controller.nextEvent();
  const laterEvent = controller.atMs;
  controller.previousEvent();
  assert.ok(controller.atMs < laterEvent);
  controller.seek(laterEvent);
  assert.equal(controller.atMs, laterEvent);
  assert.equal(frames.length, visibleWrites);
  controller.setFollow(false);
  assert.equal(controller.follow, false);
  controller.setActive(true);
  assert.equal(frames.length, visibleWrites + 1);
  assert.equal(frames.at(-1).atMs, laterEvent);
});

test("reset, completion, and invalid speed keep the clock within result bounds", () => {
  let tick;
  const controller = createPlaybackController({
    result,
    setIntervalRef: callback => { tick = callback; return 1; },
    clearIntervalRef: () => {},
    tickMs: 1000,
  });
  assert.equal(controller.seek(controller.bounds.endMs + 5000).atMs, controller.bounds.endMs);
  assert.equal(controller.reset().atMs, controller.bounds.startMs);
  controller.setSpeed(50);
  controller.play();
  tick();
  assert.equal(controller.atMs, controller.bounds.endMs);
  assert.equal(controller.playing, false);
  assert.throws(() => controller.setSpeed(0), /must be positive/);
});
