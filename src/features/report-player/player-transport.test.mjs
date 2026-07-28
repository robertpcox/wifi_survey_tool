// FEATURE:      Full-screen Report Player transport
// SURFACE:      node --test src/features/report-player/player-transport.test.mjs
// WHY TOGETHER: Reachable controls and their controller bindings operate one playback clock.
// STATE:        Rendered transport markup
// RULES:        Every transport action is explicit, accessible, and independent of wall time.
// PROVENANCE:   Scope/steps/05a_recast_player.md

import assert from "node:assert/strict";
import test from "node:test";

import { renderPlayerTransport } from "./player-transport.mjs";

test("transport exposes play, reset, speed, scrub, event stepping, follow, and clock", () => {
  const html = renderPlayerTransport(20_000);
  for (const action of ["reset", "previous", "toggle", "next"]) {
    assert.match(html, new RegExp(`data-player-action="${action}"`));
  }
  for (const control of ["speed", "follow", "seek", "clock"]) {
    assert.match(html, new RegExp(`data-player-${control}`));
  }
  assert.match(html, /max="20000"/);
  assert.match(html, /aria-label="Playback position"/);
  assert.match(html, /0\.5×/);
  assert.match(html, /4×/);
});
