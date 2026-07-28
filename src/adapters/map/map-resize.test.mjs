// FEATURE:      Shared MazeMap resize lifecycle
// SURFACE:      Two-frame resize scheduling test
// WHY TOGETHER: Exact scheduling and no-map safety are one lifecycle proof.
// STATE:        Deterministic fake frame queue
// RULES:        A reveal must settle for two frames before provider resize.
// PROVENANCE:   Scope/steps/05a_recast_player.md resize acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { resizeMapAfterLayout } from "./map-resize.mjs";

test("resize waits for exactly two injected layout frames", async () => {
  const frames = [];
  let resizes = 0;
  const pending = resizeMapAfterLayout(
    { resize: () => { resizes += 1; } },
    callback => frames.push(callback),
  );
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.equal(frames.length, 1);
  assert.equal(resizes, 0);
  frames.shift()();
  assert.equal(await pending, true);
  assert.equal(resizes, 1);
});
