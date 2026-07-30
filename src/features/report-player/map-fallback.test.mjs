// FEATURE:      Report Player map failure fallback
// SURFACE:      node --test src/features/report-player/map-fallback.test.mjs
// WHY TOGETHER: Route, heat, checkpoints, trail, and walker are the one schematic failure surface.
// STATE:        Fake canvas operation log
// RULES:        Drawing is normalized to canvas bounds and remains safe when no context exists.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import test from "node:test";

import { drawRouteFallback } from "./map-fallback.mjs";

test("fallback draws the full normalized route model and tolerates a missing context", () => {
  const calls = [];
  const context = new Proxy({}, {
    get: (_target, key) => (...args) => calls.push([String(key), ...args]),
    set: (_target, key, value) => { calls.push([String(key), value]); return true; },
  });
  const model = {
    heat: [{ x: 0.25, y: 0.5, weightSeconds: 4 }],
    routeLines: [[{ x: 0.1, y: 0.2 }, { x: 0.8, y: 0.7 }]],
    stalePathLines: [[{ x: 0.15, y: 0.25 }, { x: 0.75, y: 0.65 }]],
    pollTrail: [{ x: 0.2, y: 0.3 }, { x: 0.6, y: 0.4 }],
    checkpoints: [{ x: 0.1, y: 0.2 }],
    walker: { x: 0.5, y: 0.6 },
  };
  drawRouteFallback({
    width: 100,
    height: 80,
    getContext: () => context,
  }, model);
  assert.deepEqual(calls[0], ["clearRect", 0, 0, 100, 80]);
  assert.ok(calls.some(call => call[0] === "lineTo" && call[1] === 80 && call[2] === 56));
  assert.ok(calls.some(call => call[0] === "strokeStyle" && call[1] === "#ef4444"));
  assert.ok(calls.some(call => call[0] === "lineWidth" && call[1] === 7));
  assert.ok(calls.some(call => call[0] === "arc" && call[1] === 50 && call[2] === 48));
  assert.doesNotThrow(() => drawRouteFallback({ getContext: () => null }, model));
});
