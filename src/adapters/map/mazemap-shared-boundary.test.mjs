// FEATURE:      MazeMap Report/Player facade
// SURFACE:      Deferred binding and feature-facing API tests
// WHY TOGETHER: Pre-launch subscriptions and provider-neutral forwarding share one facade proof.
// STATE:        Fake layer calls and subscription cleanup
// RULES:        Rebinding retries evidence listeners without duplicating callbacks.
// PROVENANCE:   Scope/steps/05a_recast_player.md adapter API acceptance

import assert from "node:assert/strict";
import test from "node:test";

import { createMazeMapSharedBoundary } from "./mazemap-shared-boundary.mjs";

test("facade forwards heat/frame/mode and carries subscriptions across binding", () => {
  const calls = [];
  const floors = [];
  const boundary = createMazeMapSharedBoundary({
    setFloor: floor => floors.push(floor),
  });
  const selected = [];
  boundary.onEvidenceSelect(value => selected.push(value));
  const layers = fakeLayers(calls);
  boundary.bind(layers);
  assert.equal(boundary.drawReportHeat("sticky", { heatmaps: {} }, 3), 7);
  assert.deepEqual(floors, [3]);
  assert.equal(boundary.drawPlayerFrame({ atMs: 1 }, { accepted: false }), true);
  assert.equal(boundary.setViewMode("playback"), "playback");
  assert.equal(boundary.followWalker({ lng: 170.5, lat: -45.8, z: 2 }), true);
  assert.deepEqual(floors, [3, 2]);
  assert.equal(boundary.focusEvidence("poll-1"), true);
  layers.callback({ pairId: "poll-1" });
  assert.deepEqual(selected, [{ pairId: "poll-1" }]);
  assert.deepEqual(calls.slice(0, 3).map(item => item[0]), [
    "heat", "frame", "mode",
  ]);
});

function fakeLayers(calls) {
  return {
    callback: null,
    disablePlayerLayers: () => calls.push(["disable"]),
    drawPlayerFrame: (...args) => { calls.push(["frame", ...args]); return true; },
    drawReportHeat: (...args) => { calls.push(["heat", ...args]); return 7; },
    focusEvidence: id => id === "poll-1",
    followWalker: value => {
      calls.push(["follow", value]);
      return true;
    },
    mode: "analysis",
    playerEnabled: true,
    onEvidenceSelect(callback) {
      this.callback = callback;
      return () => { this.callback = null; };
    },
    setViewMode: mode => { calls.push(["mode", mode]); return mode; },
  };
}
