// FEATURE:      Report Player playback
// SURFACE:      node --test src/features/report-player/playback-controller.test.mjs
// WHY TOGETHER: Fixture clock, seek, speed, and completion assertions prove playback state.
// STATE:        Injected timer callback and emitted frames
// RULES:        No real timers run in this deterministic test.
// PROVENANCE:   Scope/test_plan.md Step 5

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createPlaybackController } from "./playback-controller.mjs";

const result = JSON.parse(await readFile(
  new URL("../../../data/fixtures/report-player/result.fixture.v3.json", import.meta.url),
));

test("playback controller emits shared-result frames and clamps its clock", () => {
  const frames = [];
  let tick;
  const controller = createPlaybackController({
    result,
    onFrame: frame => frames.push(frame),
    setIntervalRef: callback => { tick = callback; return 1; },
    clearIntervalRef: () => {},
    tickMs: 1000,
  });
  assert.equal(frames[0].atMs, controller.bounds.startMs);
  controller.setSpeed(2);
  controller.play();
  tick();
  assert.equal(frames.at(-1).elapsedMs, 2000);
  const final = controller.seek(controller.bounds.endMs + 5000);
  assert.equal(final.atMs, controller.bounds.endMs);
  assert.throws(() => controller.setSpeed(0), /must be positive/);
});
